from __future__ import annotations

import json
import shutil
import sqlite3
import zipfile
from pathlib import Path

import pytest

from najd_arena.canonical import digest, read_json, write_json
from najd_arena.engine import create_run, execute_run, grade_run, report_run, validate_dataset
from najd_arena.evidence import export_evidence, verify_evidence
from najd_arena.metrics import score
from najd_arena.models import Case, load_suite

ROOT = Path(__file__).resolve().parents[1]


def project(tmp_path: Path) -> Path:
    shutil.copytree(ROOT / "examples", tmp_path / "examples")
    state = tmp_path / ".najd-arena"
    state.mkdir()
    write_json(
        state / "providers.json",
        {
            "recorded-demo": {
                "plugin": "recorded",
                "model": "recorded-v1",
                "responses_file": "examples/acceptance/responses.json",
            }
        },
    )
    return tmp_path


def test_canonical_digest_is_stable() -> None:
    assert digest({"b": 2, "a": 1}) == digest({"a": 1, "b": 2})


def test_dataset_validation_and_duplicate_rejection(tmp_path: Path) -> None:
    root = project(tmp_path)
    assert validate_dataset(root / "examples/acceptance")["cases"] == 10
    cases = root / "examples/acceptance/cases.jsonl"
    first = cases.read_text(encoding="utf-8").splitlines()[0]
    cases.write_text(first + "\n" + first + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="duplicate case id"):
        load_suite(root / "examples/acceptance")


def test_metric_routing() -> None:
    case = Case("one", "json", "en", {}, {"value": {"ok": True}})
    assert score(case, '{"ok": true}')["passed"] is True
    invalid = Case("two", "unsupported", "en", {}, {})  # type: ignore[arg-type]
    with pytest.raises(ValueError, match="no compatible metric"):
        score(invalid, "")


def test_offline_run_resume_grade_report_and_evidence(tmp_path: Path) -> None:
    root = project(tmp_path)
    run_id = create_run(root, root / "examples/acceptance/experiment.json")
    run_dir = root / ".najd-arena/runs" / run_id
    before = (run_dir / "attempts.jsonl").read_text(encoding="utf-8")
    execute_run(root, run_id, retry_failed=False)
    assert (run_dir / "attempts.jsonl").read_text(encoding="utf-8") == before
    grades = grade_run(root, run_id)
    first_grades = grades.read_text(encoding="utf-8")
    grade_run(root, run_id)
    assert grades.read_text(encoding="utf-8") == first_grades
    report = read_json(report_run(root, run_id))
    assert report["first_attempt_success_rate"] == 1
    assert report["eventual_success_rate"] == 1
    assert report["mean_score"] == 1
    bundle = export_evidence(run_dir, root / "evidence.zip")
    assert verify_evidence(bundle)["files"] == 4
    with zipfile.ZipFile(bundle) as archive:
        contents = {name: archive.read(name) for name in archive.namelist()}
    contents["report.json"] = b"{}"
    with zipfile.ZipFile(bundle, "w") as archive:
        for name, content in contents.items():
            archive.writestr(name, content)
    with pytest.raises(ValueError, match="digest mismatch"):
        verify_evidence(bundle)


def test_retry_appends_and_survives_restart(tmp_path: Path) -> None:
    root = project(tmp_path)
    responses = root / "examples/acceptance/responses.json"
    values = read_json(responses)
    missing = values.pop("ar-exact-001")
    write_json(responses, values)
    run_id = create_run(root, root / "examples/acceptance/experiment.json")
    attempts_path = root / ".najd-arena/runs" / run_id / "attempts.jsonl"
    initial = [json.loads(line) for line in attempts_path.read_text(encoding="utf-8").splitlines()]
    assert len(initial) == 10
    assert sum(item["status"] == "error" for item in initial) == 1
    values["ar-exact-001"] = missing
    write_json(responses, values)
    execute_run(root, run_id, retry_failed=True)
    final = [json.loads(line) for line in attempts_path.read_text(encoding="utf-8").splitlines()]
    retried = [item for item in final if item["case_id"] == "ar-exact-001"]
    assert [item["attempt"] for item in retried] == [1, 2]
    assert retried[-1]["status"] == "ok"
    connection = sqlite3.connect(root / ".najd-arena/state.db")
    assert connection.execute("SELECT status FROM runs WHERE id = ?", (run_id,)).fetchone() == (
        "complete",
    )


def test_provider_config_contains_reference_not_secret(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = project(tmp_path)
    monkeypatch.setenv("ARENA_TEST_KEY", "super-secret-value")
    write_json(
        root / ".najd-arena/providers.json",
        {
            "live": {
                "plugin": "openai-compatible",
                "model": "test",
                "base_url": "https://example.invalid/v1",
                "api_key_env": "ARENA_TEST_KEY",
            }
        },
    )
    assert "super-secret-value" not in (root / ".najd-arena/providers.json").read_text()
