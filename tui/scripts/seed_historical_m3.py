"""Verify and optionally seed the archived HUMAIN M3 / MiniMax M3 grade snapshot.

Raw answers stay in the private archive. The database receives only case IDs,
configuration IDs, audit status, grading status, and correctness labels.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections import Counter
from pathlib import Path

EXPERIMENT_ID = "humain-m3-vs-minimax-m3-preaudit-20260909"
DATASET_REVISION = "cb30c1c9e46c62f691380c3269885cdb8f22f52b"
CASES_SHA256 = "b8b52ded0f6731b7a4764a90476edfe643f46d6a286096bab02b7ed189af94f6"
QUARANTINE_SHA256 = "5b108a254466d621da41e53acfa5b6302b310c4f9f80d8e87124d605cbfc5ed8"
REPORT_URL = "https://drive.google.com/file/d/1sxxj3zvP82EGQzcmmki_dSLruzEsQVG8/view"
ACCEPTABLE = {"correct", "possible_correct"}
LABELS = ACCEPTABLE | {"partial_correct", "wrong"}


def _sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _rows(path: Path):
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def verify(snapshot: Path, release: Path) -> tuple[dict, dict[str, dict]]:
    manifest = json.loads((snapshot / "manifest.json").read_text())
    if manifest["expected_answers"] != 6089 * 28:
        raise ValueError("historical configuration count changed")
    if manifest["schema_version"] != "najd-preaudit-grade-snapshot-v1":
        raise ValueError("unexpected historical snapshot schema")
    grades = snapshot / "grades.latest.jsonl"
    evidence = snapshot / "evidence.valid.jsonl"
    if _sha(grades) != manifest["grades_latest"]["sha256"]:
        raise ValueError("historical grades checksum mismatch")
    if _sha(evidence) != manifest["resolved_evidence"]["sha256"]:
        raise ValueError("historical evidence checksum mismatch")
    cases: dict[str, dict] = {}
    for name, expected_sha, audit_status in (
        ("cases.jsonl", CASES_SHA256, "certified"),
        ("quarantine.jsonl", QUARANTINE_SHA256, "quarantined"),
    ):
        path = release / name
        if _sha(path) != expected_sha:
            raise ValueError(f"published release checksum mismatch: {name}")
        for case in _rows(path):
            if case["id"] in cases or case["audit_status"] != audit_status:
                raise ValueError(f"invalid published case: {case['id']}")
            cases[case["id"]] = case
    if len(cases) != 6089:
        raise ValueError("published case count changed")

    differences = Counter()
    seen_evidence: set[str] = set()
    for record in _rows(evidence):
        case_id = record["case_id"]
        if case_id not in cases:
            raise ValueError(f"unknown evidence case: {case_id}")
        if case_id in seen_evidence:
            continue
        seen_evidence.add(case_id)
        for field in ("prompt", "expected"):
            differences[field] += record["case"].get(field) != cases[case_id].get(field)
    if seen_evidence != set(cases):
        raise ValueError("historical evidence lacks a published case ID")

    counts = Counter()
    labels = Counter()
    config_counts = Counter()
    seen_grades: set[tuple[str, str]] = set()
    for grade in _rows(grades):
        case_id, config_id = grade["case_id"], grade["config_id"]
        if case_id not in cases or (config_id, case_id) in seen_grades:
            raise ValueError("unknown or duplicate historical grade")
        seen_grades.add((config_id, case_id))
        config_counts[config_id] += 1
        counts[grade["grade_status"]] += 1
        label = grade.get("label")
        if grade["grade_status"] == "ok" and label not in LABELS:
            raise ValueError("grade status and label disagree")
        if grade["grade_status"] == "technical_failure" and label != "wrong":
            raise ValueError("grade status and label disagree")
        if grade["category"] != cases[case_id]["track"]:
            raise ValueError(f"category drift: {case_id}")
        labels[(config_id.split("--")[0], label)] += 1
    if len(config_counts) != 28 or set(config_counts.values()) != {6089}:
        raise ValueError("historical configurations do not cover all 6089 cases")
    if dict(counts) != manifest["status_counts"]:
        raise ValueError("historical grade status totals changed")
    summary = {
        "experiment_id": EXPERIMENT_ID,
        "cases": len(cases),
        "configurations": len(config_counts),
        "grades": sum(counts.values()),
        "grade_status": dict(counts),
        "prompt_mismatches_vs_published": differences["prompt"],
        "expected_mismatches_vs_published": differences["expected"],
        "models": {
            model: {
                "acceptable": labels[(model, "correct")] + labels[(model, "possible_correct")],
                "full_denominator": 6089 * 14,
            }
            for model in ("humain", "minimax")
        },
        "grades_sha256": _sha(grades),
        "evidence_sha256": _sha(evidence),
    }
    return summary, cases


def seed(database_url: str, snapshot: Path, summary: dict, cases: dict[str, dict]) -> None:
    import psycopg

    disclosure = (
        "Historical pre-audit experiment on 6,089 case IDs, not an exact run of the "
        "published Hugging Face case contents. Source prompts and expected fields "
        "differ on 1,419 and 1,422 cases respectively. Technical failures count as "
        "not acceptable in the full-denominator headline. No raw answers are public."
    )
    with psycopg.connect(database_url) as connection, connection.cursor() as cursor:
        cursor.execute(
            """INSERT INTO historical_experiments
                (id,title,related_report_url,source_snapshot_sha256,source_evidence_sha256,
                 published_dataset_revision,case_count,configuration_count,
                 prompt_mismatch_count,expected_mismatch_count,grading_protocol,disclosure)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO UPDATE SET
                  source_snapshot_sha256=EXCLUDED.source_snapshot_sha256,
                  source_evidence_sha256=EXCLUDED.source_evidence_sha256,
                  prompt_mismatch_count=EXCLUDED.prompt_mismatch_count,
                  expected_mismatch_count=EXCLUDED.expected_mismatch_count,
                  disclosure=EXCLUDED.disclosure""",
            (
                EXPERIMENT_ID, "HUMAIN M3 vs MiniMax M3 — historical pre-audit",
                REPORT_URL, summary["grades_sha256"], summary["evidence_sha256"],
                DATASET_REVISION, 6089, 28,
                summary["prompt_mismatches_vs_published"],
                summary["expected_mismatches_vs_published"],
                "najd-gold-answer-grade-v2", disclosure,
            ),
        )
        cursor.execute(
            "DELETE FROM historical_grades WHERE experiment_id=%s", (EXPERIMENT_ID,)
        )
        with cursor.copy(
            "COPY historical_grades (experiment_id,config_id,case_id,category,"
            "audit_status,grade_status,label) FROM STDIN"
        ) as copy:
            for grade in _rows(snapshot / "grades.latest.jsonl"):
                copy.write_row((
                    EXPERIMENT_ID, grade["config_id"], grade["case_id"],
                    grade["category"], cases[grade["case_id"]]["audit_status"],
                    grade["grade_status"],
                    grade["label"] if grade["grade_status"] == "ok" else None,
                ))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", required=True, type=Path)
    parser.add_argument("--release", required=True, type=Path)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    summary, cases = verify(args.snapshot, args.release)
    if args.write:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            parser.error("DATABASE_URL is required with --write")
        seed(database_url, args.snapshot, summary, cases)
        summary["seeded"] = True
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
