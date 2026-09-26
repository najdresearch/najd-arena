from __future__ import annotations

import asyncio
import json
import random
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .adapters import adapt, supported_sources
from .canonical import digest, write_json
from .dataset import fetch_benchmark, select_cases
from .metrics import aggregate, deterministic_grade
from .models import BenchmarkCase, ModelConfig, RunConfig
from .providers import LiteLLMProvider

Progress = Callable[[int, int, str], None]


def _state_root(project_root: Path) -> Path:
    root = project_root / ".najd-arena-v1"
    (root / "runs").mkdir(parents=True, exist_ok=True)
    return root


def _append(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, sort_keys=True) + "\n")


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


async def _judge(case: BenchmarkCase, output: str, config: ModelConfig) -> dict[str, Any]:
    provider = LiteLLMProvider(config)
    rubric = {
        "task": "Grade the candidate response against the reference and prompt.",
        "rules": [
            "Judge semantic correctness, instruction compliance, and grounding.",
            "Do not require exact phrasing.",
            "Return JSON only: {\"score\": 0 or 1, \"reason\": \"brief explanation\"}.",
        ],
        "prompt": case.prompt,
        "reference": case.expected,
        "dimensions": list(case.judge_dimensions),
        "candidate": output,
    }
    response = await provider.invoke([{"role": "user", "content": json.dumps(rubric, ensure_ascii=False)}])
    try:
        value = json.loads(response.content)
        score = 1.0 if float(value["score"]) >= 0.5 else 0.0
        reason = str(value.get("reason", ""))
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        score, reason = 0.0, "Judge returned an invalid structured verdict."
    return {"method": "llm-judge@1", "score": score, "passed": score == 1.0,
            "reason": reason, "judge_model": response.model}


async def run_benchmark(
    project_root: Path,
    config: RunConfig,
    *,
    progress: Progress | None = None,
) -> str:
    benchmark = await asyncio.to_thread(fetch_benchmark)
    cases = select_cases(benchmark, tracks=config.tracks, sample=config.sample)
    unknown = sorted({case.source_id for case in cases} - supported_sources())
    if unknown:
        raise ValueError(f"unsupported benchmark sources: {', '.join(unknown)}")
    identity = {
        "dataset_revision": benchmark.revision,
        "dataset_digest": benchmark.cases_sha256,
        "model": config.model.model,
        "api_base": config.model.api_base,
        "tracks": config.tracks,
        "sample": config.sample,
        "protocol": "najd-prompt-v1",
    }
    run_id = f"run-{digest(identity)[:12]}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}"
    run_dir = _state_root(project_root) / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    manifest = {
        "schema_version": "1", "run_id": run_id, "status": "running",
        "created_at": datetime.now(UTC).isoformat(), "dataset": {
            "id": benchmark.id, "version": benchmark.version, "revision": benchmark.revision,
            "cases_sha256": benchmark.cases_sha256,
        },
        "target": {"name": config.model.name, "model": config.model.model,
                   "api_base": config.model.api_base},
        "judge": ({"profile_id": config.judge.profile_id, "model": config.judge.model}
                  if config.judge else None),
        "protocol": "najd-prompt-v1", "canonical": config.sample is None and not config.tracks,
        "selected_cases": len(cases),
    }
    write_json(run_dir / "manifest.json", manifest)
    provider = LiteLLMProvider(config.model)
    semaphore = asyncio.Semaphore(config.concurrency)
    completed = 0

    async def evaluate(case: BenchmarkCase) -> None:
        nonlocal completed
        adapted = adapt(case)
        error: str | None = None
        response = None
        for attempt in range(1, config.max_attempts + 1):
            try:
                async with semaphore:
                    response = await provider.invoke(adapted.messages)
                _append(run_dir / "attempts.jsonl", {
                    "case_id": case.id, "track": case.track, "source": case.source_id,
                    "attempt": attempt, "status": "ok", "model": response.model,
                    "output": response.content, "tool_calls": response.tool_calls,
                    "usage": response.usage, "created_at": datetime.now(UTC).isoformat(),
                })
                break
            except Exception as exc:  # provider boundary
                error = f"{type(exc).__name__}: {exc}"
                if attempt < config.max_attempts:
                    await asyncio.sleep(min(30, (2 ** (attempt - 1)) + random.random()))
        if response is None:
            _append(run_dir / "attempts.jsonl", {"case_id": case.id, "track": case.track,
                    "source": case.source_id, "attempt": config.max_attempts, "status": "error",
                    "error": error, "created_at": datetime.now(UTC).isoformat()})
        else:
            grade = deterministic_grade(case, response.content)
            if grade is None and config.judge:
                judge_model = ModelConfig("judge", config.judge.model, config.judge.api_base,
                                          config.judge.api_key_env, 0.0, 512)
                grade = await _judge(case, response.content, judge_model)
            _append(run_dir / "grades.jsonl", {
                "case_id": case.id, "track": case.track, "source": case.source_id,
                **(grade or {"method": "ungraded", "score": None, "passed": None}),
            })
        completed += 1
        if progress:
            progress(completed, len(cases), case.id)

    await asyncio.gather(*(evaluate(case) for case in cases))
    grades = _read_jsonl(run_dir / "grades.jsonl")
    attempts = _read_jsonl(run_dir / "attempts.jsonl")
    report = {
        "schema_version": "1", "run_id": run_id,
        "status": "complete" if all(item["status"] == "ok" for item in attempts) else "incomplete",
        "canonical": bool(manifest["canonical"] and config.judge and len(grades) == len(cases)
                          and all(grade.get("score") is not None for grade in grades)),
        "total_cases": len(cases), "errors": sum(item["status"] == "error" for item in attempts),
        **aggregate(grades),
    }
    write_json(run_dir / "report.json", report)
    manifest["status"] = report["status"]
    manifest["completed_at"] = datetime.now(UTC).isoformat()
    write_json(run_dir / "manifest.json", manifest)
    return run_id


def list_runs(project_root: Path) -> list[dict[str, Any]]:
    root = _state_root(project_root) / "runs"
    values = []
    for directory in sorted(root.iterdir(), reverse=True):
        manifest = directory / "manifest.json"
        report = directory / "report.json"
        if manifest.is_file():
            value = json.loads(manifest.read_text(encoding="utf-8"))
            if report.is_file():
                value["report"] = json.loads(report.read_text(encoding="utf-8"))
            values.append(value)
    return values
