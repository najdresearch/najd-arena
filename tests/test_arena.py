from __future__ import annotations

import json
import shutil
import sqlite3
import subprocess
import sys
import types
import zipfile
from pathlib import Path

import pytest

from najd_arena import publication
from najd_arena.canonical import digest, read_json, write_json
from najd_arena.engine import create_run, execute_run, grade_run, report_run, validate_dataset
from najd_arena.evidence import export_evidence, verify_evidence
from najd_arena.metrics import score
from najd_arena.models import Case, load_suite
from najd_arena.publication import prepare_dataset, prepare_run, publish_release

ROOT = Path(__file__).resolve().parents[1]


def project(tmp_path: Path) -> Path:
    shutil.copytree(ROOT / "examples", tmp_path / "examples")
    shutil.copy2(ROOT / "uv.lock", tmp_path / "uv.lock")
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
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.email", "test@najdresearch.com"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.name", "Najd Test"], cwd=tmp_path, check=True)
    subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
    subprocess.run(["git", "commit", "-qm", "fixture"], cwd=tmp_path, check=True)
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
    second_bundle = export_evidence(run_dir, root / "evidence-second.zip")
    assert bundle.read_bytes() == second_bundle.read_bytes()
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


def approval(target_type: str, target_id: str, license_name: str) -> dict[str, object]:
    return {
        "schema_version": "1",
        "target_type": target_type,
        "target_id": target_id,
        "public": True,
        "license": license_name,
        "provenance": {"source": "Najd Arena tests", "creators": ["Najd Research"]},
        "citation": "Najd Research. Najd Arena tests.",
        "review": {
            "reviewer": "test-reviewer",
            "reviewed_at": "2026-09-14",
            "license_approved": True,
            "privacy_approved": True,
            "raw_outputs_approved": target_type == "run",
        },
    }


def test_dataset_release_preparation_is_deterministic(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = project(tmp_path)
    monkeypatch.setattr(publication, "_git_metadata", lambda _: {"revision": "a" * 40})
    approval_path = root / "suite-publication.json"
    write_json(
        approval_path,
        approval("suite", "najd-arena-acceptance@1.0.0", "CC0-1.0"),
    )
    first = root / "first"
    second = root / "second"
    prepare_dataset(root, root / "examples/acceptance", approval_path, first)
    prepare_dataset(root, root / "examples/acceptance", approval_path, second)
    assert read_json(first / "release.json") == read_json(second / "release.json")
    for path in (first / "payload").rglob("*"):
        if path.is_file():
            relative = path.relative_to(first / "payload")
            assert path.read_bytes() == (second / "payload" / relative).read_bytes()


def test_run_release_contains_full_reproduction_record(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = project(tmp_path)
    run_id = create_run(root, root / "examples/acceptance/experiment.json")
    grade_run(root, run_id)
    report_run(root, run_id)
    manifest = read_json(root / ".najd-arena/runs" / run_id / "manifest.json")
    monkeypatch.setattr(
        publication, "_git_metadata", lambda _: {"revision": manifest["code_revision"]}
    )
    approval_path = root / "run-publication.json"
    write_json(approval_path, approval("run", run_id, "CC-BY-4.0"))
    output = root / "release"
    prepare_run(root, run_id, approval_path, "b" * 40, output)
    target = output / "payload" / "runs" / run_id
    reproduction = read_json(target / "reproduction.json")
    assert reproduction["dataset"]["cases_sha256"] == manifest["cases_digest"]
    assert reproduction["dataset"]["revision"] == "b" * 40
    assert verify_evidence(target / "evidence.zip")["run_id"] == run_id


def test_run_release_rejects_potential_credentials(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = project(tmp_path)
    run_id = create_run(root, root / "examples/acceptance/experiment.json")
    grade_run(root, run_id)
    report_run(root, run_id)
    manifest = read_json(root / ".najd-arena/runs" / run_id / "manifest.json")
    monkeypatch.setattr(
        publication, "_git_metadata", lambda _: {"revision": manifest["code_revision"]}
    )
    attempts_path = root / ".najd-arena/runs" / run_id / "attempts.jsonl"
    attempts = [json.loads(line) for line in attempts_path.read_text(encoding="utf-8").splitlines()]
    attempts[0]["response"]["usage"] = {"token": "secret"}
    portable = {key: value for key, value in attempts[0].items() if key != "object_digest"}
    attempts[0]["object_digest"] = digest(portable)
    write_json(root / ".najd-arena/objects/sha256" / attempts[0]["object_digest"], portable)
    attempts_path.write_text(
        "".join(json.dumps(item, ensure_ascii=False, sort_keys=True) + "\n" for item in attempts),
        encoding="utf-8",
    )
    approval_path = root / "run-publication.json"
    write_json(approval_path, approval("run", run_id, "CC-BY-4.0"))
    with pytest.raises(ValueError, match="potential secret field"):
        prepare_run(root, run_id, approval_path, "b" * 40, root / "release")


def test_publish_uses_guarded_hub_commit(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = project(tmp_path)
    monkeypatch.setattr(publication, "_git_metadata", lambda _: {"revision": "a" * 40})
    approval_path = root / "suite-publication.json"
    write_json(
        approval_path,
        approval("suite", "najd-arena-acceptance@1.0.0", "CC0-1.0"),
    )
    staging = root / "release"
    prepare_dataset(root, root / "examples/acceptance", approval_path, staging)
    calls: dict[str, object] = {}

    class FakeOperation:
        def __init__(self, **values: object):
            self.values = values

    class FakeApi:
        def __init__(self, token: str | None):
            calls["token"] = token

        def create_repo(self, **values: object) -> None:
            calls["repo"] = values

        def repo_info(self, **_: object) -> object:
            return types.SimpleNamespace(sha="c" * 40)

        def list_repo_files(self, **_: object) -> list[str]:
            return []

        def create_commit(self, **values: object) -> object:
            calls["commit"] = values
            return types.SimpleNamespace(oid="d" * 40, commit_url="https://example.invalid/commit")

        def create_tag(self, **values: object) -> None:
            calls["tag"] = values

    fake_hub = types.SimpleNamespace(HfApi=FakeApi, CommitOperationAdd=FakeOperation)
    monkeypatch.setitem(sys.modules, "huggingface_hub", fake_hub)
    receipt = publish_release(staging)
    assert receipt["status"] == "published"
    assert receipt["revision"] == "d" * 40
    assert calls["commit"]["parent_commit"] == "c" * 40  # type: ignore[index]


def test_publish_is_idempotent_but_rejects_changed_remote_content(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import huggingface_hub

    root = project(tmp_path)
    monkeypatch.setattr(publication, "_git_metadata", lambda _: {"revision": "a" * 40})
    approval_path = root / "suite-publication.json"
    write_json(
        approval_path,
        approval("suite", "najd-arena-acceptance@1.0.0", "CC0-1.0"),
    )
    staging = root / "release"
    prepare_dataset(root, root / "examples/acceptance", approval_path, staging)
    release = read_json(staging / "release.json")
    prefix = release["immutable_prefix"] + "/"
    remote_files = [path for path in release["files"] if path.startswith(prefix)]

    class ExistingApi:
        def __init__(self, token: str | None):
            del token

        def create_repo(self, **_: object) -> None:
            return None

        def repo_info(self, **_: object) -> object:
            return types.SimpleNamespace(sha="c" * 40, private=False)

        def list_repo_files(self, **_: object) -> list[str]:
            return remote_files

    monkeypatch.setattr(huggingface_hub, "HfApi", ExistingApi)
    monkeypatch.setattr(
        publication,
        "_remote_file_digest",
        lambda _repo, _revision, path: release["files"][path],
    )
    assert publish_release(staging)["status"] == "unchanged"
    monkeypatch.setattr(publication, "_remote_file_digest", lambda *_: "0" * 64)
    with pytest.raises(ValueError, match="immutable remote path already differs"):
        publish_release(staging)
