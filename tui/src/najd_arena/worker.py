from __future__ import annotations

import asyncio
import json
import os
import socket
import time
from collections import defaultdict
from contextlib import contextmanager
from typing import Any

import boto3
import psycopg
import redis
from litellm import acompletion

from .adapters import adapt
from .dataset import fetch_benchmark
from .engine import _judge
from .hosted import CredentialCipher, EncryptedSecret, validate_public_endpoint
from .metrics import deterministic_grade
from .models import ModelConfig

STREAMS = {"orchestration": "arena:orchestration", "inference": "arena:inference",
           "grading": "arena:grading"}


def _database() -> psycopg.Connection[Any]:
    return psycopg.connect(os.environ["DATABASE_URL"], autocommit=True)


def _redis() -> redis.Redis:
    return redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True)


def _s3():
    return boto3.client("s3", endpoint_url=os.getenv("S3_ENDPOINT"),
                        aws_access_key_id=os.getenv("S3_ACCESS_KEY_ID"),
                        aws_secret_access_key=os.getenv("S3_SECRET_ACCESS_KEY"),
                        region_name=os.getenv("S3_REGION", "us-east-1"))


def _run(connection: psycopg.Connection[Any], run_id: str) -> dict[str, Any]:
    cursor = connection.execute("SELECT * FROM runs WHERE id=%s", (run_id,))
    row = cursor.fetchone()
    if row is None:
        raise ValueError(f"unknown run {run_id}")
    return dict(zip([item.name for item in cursor.description], row, strict=True))


def _token(connection: psycopg.Connection[Any], run: dict[str, Any]) -> str:
    row = connection.execute("SELECT ciphertext,nonce,auth_tag,key_id FROM run_credentials "
                             "WHERE run_id=%s AND deleted_at IS NULL", (run["id"],)).fetchone()
    if row is None:
        raise ValueError("run credential is unavailable")
    return CredentialCipher.from_environment().decrypt(
        EncryptedSecret(*row), run_id=str(run["id"]), organization_id=str(run["organization_id"]))


def prepare_run(run_id: str) -> None:
    benchmark = fetch_benchmark()
    queue = _redis()
    with _database() as connection:
        run = _run(connection, run_id)
        validate_public_endpoint(run["endpoint_url"])
        connection.execute("UPDATE runs SET status='running_inference',updated_at=now() WHERE id=%s",
                           (run_id,))
        with connection.cursor() as cursor:
            cursor.executemany("INSERT INTO case_results(run_id,case_id,track,source_id,stage,status) "
                               "VALUES (%s,%s,%s,%s,'inference','queued') ON CONFLICT DO NOTHING",
                               [(run_id, case.id, case.track, case.source_id) for case in benchmark.cases])
        for case in benchmark.cases:
            queue.xadd(STREAMS["inference"], {"type": "evaluate_case", "run_id": run_id,
                                              "case_id": case.id})


def _rate_limit(queue: redis.Redis, run: dict[str, Any]) -> None:
    key = f"arena:rate:{run['id']}"
    while True:
        now = time.time()
        token_key = f"arena:tpm:{run['id']}:{int(now // 60)}"
        if int(queue.get(token_key) or 0) >= int(run["tpm"]):
            time.sleep(1)
            continue
        pipe = queue.pipeline(transaction=True)
        pipe.zremrangebyscore(key, 0, now - 60)
        pipe.zcard(key)
        if int(pipe.execute()[1]) < int(run["rpm"]):
            queue.zadd(key, {f"{socket.gethostname()}:{time.time_ns()}": now})
            queue.expire(key, 70)
            return
        time.sleep(1)


@contextmanager
def _concurrency_slot(queue: redis.Redis, run: dict[str, Any]):
    key = f"arena:concurrency:{run['id']}"
    while True:
        active = queue.incr(key)
        queue.expire(key, 180)
        if active <= int(run["concurrency"]):
            break
        queue.decr(key)
        time.sleep(0.25)
    try:
        yield
    finally:
        queue.decr(key)


def evaluate_case(run_id: str, case_id: str) -> None:
    case = next(case for case in fetch_benchmark().cases if case.id == case_id)
    queue = _redis()
    with _database() as connection:
        existing = connection.execute("SELECT status FROM case_results WHERE run_id=%s AND case_id=%s "
                                      "AND stage='inference'", (run_id, case_id)).fetchone()
        if existing and existing[0] == "complete":
            return
        run = _run(connection, run_id)
        if run["status"] in {"cancelled", "rejected", "published"}:
            return
        token = _token(connection, run)
        validate_public_endpoint(run["endpoint_url"])
        _rate_limit(queue, run)

        async def invoke() -> Any:
            return await acompletion(model=f"openai/{run['model_id']}", api_base=run["endpoint_url"],
                                     api_key=token, messages=adapt(case).messages, temperature=0,
                                     max_tokens=1024, timeout=120)

        try:
            with _concurrency_slot(queue, run):
                response = asyncio.run(invoke())
            message = response.choices[0].message
            payload = {"output": message.content or "", "model": response.model or run["model_id"],
                       "usage": response.usage.model_dump() if response.usage else {}}
            minute_key = f"arena:tpm:{run_id}:{int(time.time() // 60)}"
            queue.incrby(minute_key, int(payload["usage"].get("total_tokens", 0)))
            queue.expire(minute_key, 120)
            key = f"runs/{run_id}/outputs/{case_id}.json"
            _s3().put_object(Bucket=os.environ["S3_BUCKET"], Key=key,
                             Body=json.dumps(payload, ensure_ascii=False).encode(),
                             ContentType="application/json")
            connection.execute("UPDATE case_results SET status='complete',artifact_key=%s,usage=%s,"
                               "updated_at=now() WHERE run_id=%s AND case_id=%s AND stage='inference'",
                               (key, json.dumps(payload["usage"]), run_id, case_id))
            connection.execute("UPDATE runs SET returned_model_id=COALESCE(returned_model_id,%s),"
                               "updated_at=now() WHERE id=%s", (payload["model"], run_id))
            inference_count = connection.execute(
                "SELECT count(*) FROM case_results WHERE run_id=%s AND stage='inference' "
                "AND status='complete'", (run_id,)
            ).fetchone()[0]
            if inference_count == run["total_cases"]:
                connection.execute(
                    "UPDATE run_credentials SET ciphertext='',nonce='',auth_tag='',deleted_at=now() "
                    "WHERE run_id=%s AND deleted_at IS NULL", (run_id,)
                )
            queue.xadd(STREAMS["grading"], {"type": "grade_case", "run_id": run_id,
                                            "case_id": case_id})
        except Exception as exc:
            connection.execute("UPDATE case_results SET status='error',error=%s,updated_at=now() "
                               "WHERE run_id=%s AND case_id=%s AND stage='inference'",
                               (f"{type(exc).__name__}: {exc}", run_id, case_id))
            raise


def grade_case(run_id: str, case_id: str) -> None:
    case = next(case for case in fetch_benchmark().cases if case.id == case_id)
    key = f"runs/{run_id}/outputs/{case_id}.json"
    payload = json.loads(_s3().get_object(Bucket=os.environ["S3_BUCKET"], Key=key)["Body"].read())
    grade = deterministic_grade(case, payload["output"])
    if grade is None:
        config = ModelConfig("najd-judge", os.environ["NAJD_JUDGE_MODEL"],
                             os.getenv("NAJD_JUDGE_API_BASE"), "NAJD_JUDGE_API_KEY", 0, 512)
        grade = asyncio.run(_judge(case, payload["output"], config))
    with _database() as connection:
        if _run(connection, run_id)["status"] == "cancelled":
            return
        connection.execute("INSERT INTO case_results(run_id,case_id,track,source_id,stage,status,score,method) "
                           "VALUES (%s,%s,%s,%s,'grading','complete',%s,%s) ON CONFLICT "
                           "(run_id,case_id,stage,attempt) DO UPDATE SET status='complete',score=excluded.score,"
                           "method=excluded.method,updated_at=now()",
                           (run_id, case_id, case.track, case.source_id, grade["score"], grade["method"]))
        count = connection.execute("SELECT count(*) FROM case_results WHERE run_id=%s AND stage='grading' "
                                   "AND status='complete'", (run_id,)).fetchone()[0]
        run = _run(connection, run_id)
        connection.execute("UPDATE runs SET completed_cases=%s,status='grading',updated_at=now() WHERE id=%s",
                           (count, run_id))
        if count == run["total_cases"]:
            connection.execute("UPDATE run_credentials SET ciphertext='',nonce='',auth_tag='',deleted_at=now() "
                               "WHERE run_id=%s", (run_id,))
            _redis().xadd(STREAMS["orchestration"], {"type": "finalize_run", "run_id": run_id})


def finalize_run(run_id: str) -> None:
    with _database() as connection:
        rows = connection.execute("SELECT track,score FROM case_results WHERE run_id=%s AND stage='grading' "
                                  "AND status='complete'", (run_id,)).fetchall()
        grouped: dict[str, list[float]] = defaultdict(list)
        for track, score in rows:
            grouped[track].append(float(score))
        tracks = [{"name": track, "score": sum(values) / len(values), "cases": len(values)}
                  for track, values in sorted(grouped.items())]
        macro = sum(item["score"] for item in tracks) / len(tracks)
        micro = sum(score for values in grouped.values() for score in values) / len(rows)
        connection.execute("UPDATE runs SET status='awaiting_review',najd_score=%s,case_weighted_score=%s,"
                           "coverage=1,track_scores=%s,completed_at=now(),updated_at=now() WHERE id=%s",
                           (macro, micro, json.dumps(tracks), run_id))


def resume_run(run_id: str) -> None:
    queue = _redis()
    with _database() as connection:
        rows = connection.execute("SELECT case_id FROM case_results WHERE run_id=%s AND stage='inference' "
                                  "AND status!='complete'", (run_id,)).fetchall()
        connection.execute("UPDATE case_results SET status='queued',error=NULL WHERE run_id=%s "
                           "AND stage='inference' AND status!='complete'", (run_id,))
    for (case_id,) in rows:
        queue.xadd(STREAMS["inference"], {"type": "evaluate_case", "run_id": run_id,
                                          "case_id": case_id})


def delete_run(run_id: str) -> None:
    client = _s3()
    prefix = f"runs/{run_id}/"
    continuation: str | None = None
    while True:
        kwargs = {"Bucket": os.environ["S3_BUCKET"], "Prefix": prefix}
        if continuation:
            kwargs["ContinuationToken"] = continuation
        page = client.list_objects_v2(**kwargs)
        objects = [{"Key": item["Key"]} for item in page.get("Contents", [])]
        if objects:
            client.delete_objects(Bucket=os.environ["S3_BUCKET"], Delete={"Objects": objects})
        if not page.get("IsTruncated"):
            break
        continuation = page["NextContinuationToken"]
    with _database() as connection:
        connection.execute("DELETE FROM runs WHERE id=%s AND status!='published'", (run_id,))


HANDLERS = {"prepare_run": prepare_run, "evaluate_case": evaluate_case,
            "grade_case": grade_case, "finalize_run": finalize_run,
            "resume_run": resume_run, "delete_run": delete_run}


def main() -> None:
    role = os.getenv("ARENA_WORKER_ROLE", "orchestration")
    stream, group = STREAMS[role], f"arena-{role}"
    consumer, queue = f"{socket.gethostname()}-{os.getpid()}", _redis()
    try:
        queue.xgroup_create(stream, group, id="0", mkstream=True)
    except redis.ResponseError as exc:
        if "BUSYGROUP" not in str(exc):
            raise
    while True:
        for _, entries in queue.xreadgroup(group, consumer, {stream: ">"}, count=1, block=5000):
            for message_id, fields in entries:
                try:
                    arguments = [fields["run_id"]]
                    if "case_id" in fields:
                        arguments.append(fields["case_id"])
                    HANDLERS[fields["type"]](*arguments)
                except Exception as exc:
                    attempt = int(fields.get("attempt", "1"))
                    error = f"{type(exc).__name__}: {exc}"
                    if attempt < 5 and "401" not in error and "403" not in error:
                        time.sleep(min(30, 2 ** (attempt - 1)))
                        queue.xadd(stream, {**fields, "attempt": str(attempt + 1)})
                    else:
                        queue.xadd("arena:dead-letter", {**fields, "error": error})
                        with _database() as connection:
                            if "401" in error or "403" in error:
                                connection.execute(
                                    "UPDATE runs SET status='needs_credentials',error=%s,updated_at=now() "
                                    "WHERE id=%s", (error, fields["run_id"]),
                                )
                                connection.execute(
                                    "UPDATE run_credentials SET ciphertext='',nonce='',auth_tag='',"
                                    "deleted_at=now() WHERE run_id=%s",
                                    (fields["run_id"],),
                                )
                            else:
                                connection.execute(
                                    "UPDATE runs SET status='failed',error=%s,updated_at=now() WHERE id=%s",
                                    (error, fields["run_id"]),
                                )
                queue.xack(stream, group, message_id)


if __name__ == "__main__":
    main()
