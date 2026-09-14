from __future__ import annotations

import json
import platform
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .canonical import digest, file_digest, read_json, write_json
from .metrics import score
from .models import Experiment, ProviderConfig, load_experiment, load_suite
from .providers import build_provider
from .storage import LocalStore


def _git_revision(root: Path) -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True, capture_output=True, check=False
    )
    return result.stdout.strip() or "uncommitted"


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def load_providers(project_root: Path) -> dict[str, ProviderConfig]:
    path = project_root / ".najd-arena" / "providers.json"
    values = read_json(path) if path.exists() else {}
    return {
        name: ProviderConfig.from_dict({"name": name, **value}) for name, value in values.items()
    }


def validate_dataset(path: Path) -> dict[str, Any]:
    suite = load_suite(path)
    return {"status": "pass", "id": suite.id, "version": suite.version, "cases": len(suite.cases)}


def create_run(project_root: Path, experiment_path: Path) -> str:
    experiment = load_experiment(experiment_path)
    suite_path = (experiment_path.parent / experiment.suite).resolve()
    suite = load_suite(suite_path)
    providers = load_providers(project_root)
    if experiment.provider not in providers:
        raise ValueError(f"provider {experiment.provider!r} is not configured")
    provider_config = providers[experiment.provider]
    lockfile = project_root / "uv.lock"
    resolved = {
        "schema_version": "1",
        "experiment": experiment.__dict__,
        "suite": {
            "id": suite.id,
            "version": suite.version,
            "license": suite.license,
            "cases_file": suite.cases_file,
        },
        "cases_digest": file_digest(suite.root / suite.cases_file),
        "provider": {
            "name": provider_config.name,
            "plugin": provider_config.plugin,
            "model": provider_config.model,
            "base_url": provider_config.base_url,
            "api_key_env": provider_config.api_key_env,
            "responses_file": provider_config.responses_file,
        },
        "code_revision": _git_revision(project_root),
        "environment": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "lockfile": "uv.lock" if lockfile.is_file() else None,
            "lockfile_sha256": file_digest(lockfile) if lockfile.is_file() else None,
        },
        "experiment_path": str(experiment_path.relative_to(project_root)),
    }
    run_id = f"{experiment.id}-{digest(resolved)[:12]}"
    store = LocalStore(project_root / ".najd-arena")
    run_dir = store.runs_root / run_id
    manifest_path = run_dir / "manifest.json"
    if not manifest_path.exists():
        resolved["run_id"] = run_id
        resolved["created_at"] = datetime.now(UTC).isoformat()
        write_json(manifest_path, resolved)
    store.record_run(run_id, "ready", manifest_path)
    execute_run(project_root, run_id, retry_failed=False)
    return run_id


def execute_run(project_root: Path, run_id: str, *, retry_failed: bool) -> None:
    store = LocalStore(project_root / ".najd-arena")
    run_dir = store.runs_root / run_id
    manifest = read_json(run_dir / "manifest.json")
    experiment = Experiment.from_dict(manifest["experiment"])
    experiment_path = project_root / manifest["experiment_path"]
    suite = load_suite((experiment_path.parent / experiment.suite).resolve())
    config = load_providers(project_root)[experiment.provider]
    provider = build_provider(config, project_root)
    attempts_path = run_dir / "attempts.jsonl"
    prior = _read_jsonl(attempts_path)
    by_case: dict[str, list[dict[str, Any]]] = {}
    for attempt in prior:
        by_case.setdefault(attempt["case_id"], []).append(attempt)
    store.record_run(run_id, "running", run_dir / "manifest.json")
    for case in suite.cases:
        history = by_case.get(case.id, [])
        if any(item["status"] == "ok" for item in history):
            continue
        if history and not retry_failed:
            continue
        attempt_number = len(history) + 1
        if attempt_number > experiment.max_attempts:
            continue
        try:
            response = provider.invoke(
                case, temperature=experiment.temperature, max_tokens=experiment.max_tokens
            )
            status, error = "ok", None
        # Provider plugins are an isolation boundary and can raise implementation-specific errors.
        except Exception as exception:  # noqa: BLE001
            response, status, error = {}, "error", f"{type(exception).__name__}: {exception}"
        record = {
            "schema_version": "1",
            "run_id": run_id,
            "case_id": case.id,
            "attempt": attempt_number,
            "status": status,
            "response": response,
            "error": error,
            "created_at": datetime.now(UTC).isoformat(),
        }
        object_digest = store.put_object(record)
        record["object_digest"] = object_digest
        store.append_jsonl(attempts_path, record)
        store.record_attempt(run_id, case.id, attempt_number, status, object_digest)
    final = _read_jsonl(attempts_path)
    expected = {case.id for case in suite.cases}
    succeeded = {item["case_id"] for item in final if item["status"] == "ok"}
    store.record_run(
        run_id, "complete" if expected <= succeeded else "incomplete", run_dir / "manifest.json"
    )


def grade_run(project_root: Path, run_id: str) -> Path:
    store = LocalStore(project_root / ".najd-arena")
    run_dir = store.runs_root / run_id
    manifest = read_json(run_dir / "manifest.json")
    experiment = Experiment.from_dict(manifest["experiment"])
    experiment_path = project_root / manifest["experiment_path"]
    suite = load_suite((experiment_path.parent / experiment.suite).resolve())
    cases = {case.id: case for case in suite.cases}
    latest: dict[str, dict[str, Any]] = {}
    for attempt in _read_jsonl(run_dir / "attempts.jsonl"):
        if attempt["status"] == "ok":
            latest[attempt["case_id"]] = attempt
    grades_path = run_dir / "grades.jsonl"
    existing = {
        (grade["case_id"], grade["attempt"], grade["metric"]) for grade in _read_jsonl(grades_path)
    }
    for case_id, attempt in sorted(latest.items()):
        grade = {
            "schema_version": "1",
            "run_id": run_id,
            "case_id": case_id,
            "attempt": attempt["attempt"],
            **score(cases[case_id], attempt["response"]["output"]),
        }
        key = (grade["case_id"], grade["attempt"], grade["metric"])
        if key not in existing:
            store.append_jsonl(grades_path, grade)
    return grades_path


def report_run(project_root: Path, run_id: str) -> Path:
    run_dir = project_root / ".najd-arena" / "runs" / run_id
    attempts = _read_jsonl(run_dir / "attempts.jsonl")
    grades = _read_jsonl(run_dir / "grades.jsonl")
    case_ids = {item["case_id"] for item in attempts}
    first_ok = {
        item["case_id"] for item in attempts if item["attempt"] == 1 and item["status"] == "ok"
    }
    eventual_ok = {item["case_id"] for item in attempts if item["status"] == "ok"}
    report = {
        "run_id": run_id,
        "cases_attempted": len(case_ids),
        "first_attempt_success_rate": len(first_ok) / len(case_ids) if case_ids else 0,
        "eventual_success_rate": len(eventual_ok) / len(case_ids) if case_ids else 0,
        "graded_cases": len(grades),
        "mean_score": sum(item["score"] for item in grades) / len(grades) if grades else 0,
    }
    path = run_dir / "report.json"
    write_json(path, report)
    return path
