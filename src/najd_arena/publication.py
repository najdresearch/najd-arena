from __future__ import annotations

import json
import os
import platform
import re
import subprocess
import zipfile
from pathlib import Path
from typing import Any

from .canonical import digest, file_digest, read_json, write_json
from .evidence import export_evidence, verify_evidence
from .metrics import score
from .models import load_suite, validate_document

DATASET_REPO = "najdresearch/najd-arena"
RESULTS_REPO = "najdresearch/najd-arena-results"
RESULTS_LICENSE = "CC-BY-4.0"
_SECRET_KEY = re.compile(
    r"(?:^|_)(?:password|secret|token|api[_-]?key)(?:$|_)", re.IGNORECASE
)
_SECRET_VALUE = re.compile(r"(?:hf_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{16,})")


def _jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def _approval(path: Path, *, target_type: str, target_id: str, license_name: str) -> dict[str, Any]:
    value = read_json(path)
    validate_document(value, "publication.schema.json")
    if value["target_type"] != target_type or value["target_id"] != target_id:
        raise ValueError(f"approval must target {target_type} {target_id!r}")
    if value["license"] != license_name:
        raise ValueError(f"approval license must be {license_name!r}")
    if target_type == "run" and not value["review"]["raw_outputs_approved"]:
        raise ValueError("run approval must explicitly approve raw outputs")
    return value


def _git_metadata(root: Path) -> dict[str, Any]:
    revision = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True, capture_output=True, check=False
    )
    if revision.returncode or not revision.stdout.strip():
        raise ValueError("publication requires a committed Git revision")
    status = subprocess.run(
        ["git", "status", "--porcelain", "--untracked-files=normal"],
        cwd=root,
        text=True,
        capture_output=True,
        check=False,
    )
    if status.returncode or status.stdout.strip():
        raise ValueError("publication requires a clean Git worktree")
    return {"revision": revision.stdout.strip(), "clean": True}


def _ensure_empty(path: Path) -> None:
    if path.exists() and any(path.iterdir()):
        raise ValueError(f"staging directory must be empty: {path}")
    path.mkdir(parents=True, exist_ok=True)


def _copy_exact(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(source.read_bytes())


def _walk_values(value: Any, location: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if _SECRET_KEY.search(key) and not key.endswith("_env"):
                raise ValueError(f"potential secret field at {location}.{key}")
            _walk_values(child, f"{location}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _walk_values(child, f"{location}[{index}]")
    elif isinstance(value, str):
        if _SECRET_VALUE.search(value):
            raise ValueError(f"potential credential at {location}")
        if value.startswith(("/Users/", "/home/", "C:\\Users\\")):
            raise ValueError(f"local absolute path at {location}")


def _scan_payload(payload: Path) -> None:
    for path in sorted(payload.rglob("*")):
        if path.suffix in {".json", ".jsonl"} and path.is_file():
            if path.suffix == ".jsonl":
                for value in _jsonl(path):
                    _walk_values(value)
            else:
                _walk_values(read_json(path))


def _dataset_card() -> str:
    return """---
pretty_name: Najd Arena
license: other
language:
- ar
- en
configs:
- config_name: suites
  data_files:
  - split: test
    path: suites/*/*/*.jsonl
---

# Najd Arena datasets

Versioned, evidence-first evaluation suites from Najd Research. Each suite directory is
immutable and carries its own license, provenance, approval, and SHA-256 checksums.
"""


def _results_card() -> str:
    return """---
pretty_name: Najd Arena Results
license: cc-by-4.0
configs:
- config_name: attempts
  data_files:
  - split: results
    path: runs/*/attempts.jsonl
- config_name: grades
  data_files:
  - split: results
    path: runs/*/grades.jsonl
---

# Najd Arena results

Immutable full-fidelity run evidence. Najd-authored metadata and reports are CC BY 4.0;
raw model outputs may also be subject to the provider and model terms recorded per run.
"""


def _finish_release(
    output: Path,
    *,
    kind: str,
    repo_id: str,
    immutable_prefix: str,
    identity: dict[str, Any],
    dependency: dict[str, Any] | None = None,
) -> Path:
    payload = output / "payload"
    _scan_payload(payload)
    files = {
        path.relative_to(payload).as_posix(): file_digest(path)
        for path in sorted(payload.rglob("*"))
        if path.is_file()
    }
    release = {
        "schema_version": "1",
        "kind": kind,
        "repo_id": repo_id,
        "repo_type": "dataset",
        "immutable_prefix": immutable_prefix,
        **identity,
        "files": files,
        "content_digest": digest(files),
    }
    if dependency is not None:
        release["dataset_dependency"] = dependency
    write_json(output / "release.json", release)
    return output / "release.json"


def prepare_dataset(
    project_root: Path, suite_path: Path, approval_path: Path, output: Path
) -> Path:
    git = _git_metadata(project_root)
    suite = load_suite(suite_path)
    target_id = f"{suite.id}@{suite.version}"
    approval = _approval(
        approval_path, target_type="suite", target_id=target_id, license_name=suite.license
    )
    _ensure_empty(output)
    relative = Path("suites") / suite.id / suite.version
    target = output / "payload" / relative
    _copy_exact(suite_path / "suite.json", target / "suite.json")
    _copy_exact(suite_path / suite.cases_file, target / suite.cases_file)
    write_json(target / "publication.json", approval)
    checksums = {
        name: file_digest(target / name)
        for name in ("suite.json", suite.cases_file, "publication.json")
    }
    write_json(target / "checksums.json", {"schema_version": "1", "files": checksums})
    (output / "payload" / "README.md").write_text(_dataset_card(), encoding="utf-8")
    return _finish_release(
        output,
        kind="dataset",
        repo_id=DATASET_REPO,
        immutable_prefix=relative.as_posix(),
        identity={
            "suite_id": suite.id,
            "suite_version": suite.version,
            "cases_digest": file_digest(suite_path / suite.cases_file),
            "source_revision": git["revision"],
        },
    )


def _validate_complete_run(
    project_root: Path, run_dir: Path
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    required = ("manifest.json", "attempts.jsonl", "grades.jsonl", "report.json")
    missing = [name for name in required if not (run_dir / name).is_file()]
    if missing:
        raise ValueError(f"run is not ready for publication; missing: {', '.join(missing)}")
    manifest = read_json(run_dir / "manifest.json")
    attempts = _jsonl(run_dir / "attempts.jsonl")
    grades = _jsonl(run_dir / "grades.jsonl")
    experiment_path = project_root / manifest["experiment_path"]
    suite = load_suite((experiment_path.parent / manifest["experiment"]["suite"]).resolve())
    cases = {case.id: case for case in suite.cases}
    attempts_by_key: dict[tuple[str, int], dict[str, Any]] = {}
    for attempt in attempts:
        stored_digest = attempt.get("object_digest")
        portable = {key: value for key, value in attempt.items() if key != "object_digest"}
        if stored_digest != digest(portable):
            raise ValueError("attempt object digest mismatch")
        object_path = project_root / ".najd-arena" / "objects" / "sha256" / stored_digest
        if not object_path.is_file() or read_json(object_path) != portable:
            raise ValueError("attempt object is missing or altered")
        attempts_by_key[(attempt["case_id"], attempt["attempt"])] = attempt
    for grade in grades:
        attempt = attempts_by_key.get((grade["case_id"], grade["attempt"]))
        if attempt is None or attempt["status"] != "ok":
            raise ValueError("grade does not reference a successful attempt")
        expected_grade = score(cases[grade["case_id"]], attempt["response"]["output"])
        if any(grade.get(key) != expected_grade[key] for key in ("metric", "score", "passed")):
            raise ValueError("saved grade does not match the scorer")
    attempted = {item["case_id"] for item in attempts}
    successful = {item["case_id"] for item in attempts if item["status"] == "ok"}
    graded = {item["case_id"] for item in grades}
    if attempted != set(cases) or successful != attempted or graded != successful:
        raise ValueError("run must be complete and every case must be successfully graded")
    return manifest, attempts


def prepare_run(
    project_root: Path,
    run_id: str,
    approval_path: Path,
    dataset_revision: str,
    output: Path,
) -> Path:
    git = _git_metadata(project_root)
    run_dir = project_root / ".najd-arena" / "runs" / run_id
    manifest, _ = _validate_complete_run(project_root, run_dir)
    if manifest.get("run_id") != run_id:
        raise ValueError("run manifest ID does not match the requested run")
    run_revision = manifest.get("code_revision")
    if not isinstance(run_revision, str) or not re.fullmatch(r"[0-9a-f]{40,64}", run_revision):
        raise ValueError("run must reference a committed Git revision")
    revision_check = subprocess.run(
        ["git", "cat-file", "-e", f"{run_revision}^{{commit}}"],
        cwd=project_root,
        capture_output=True,
        check=False,
    )
    if revision_check.returncode:
        raise ValueError("run Git revision is not available in the local repository")
    approval = _approval(
        approval_path, target_type="run", target_id=run_id, license_name=RESULTS_LICENSE
    )
    if not re.fullmatch(r"[0-9a-f]{40,64}", dataset_revision):
        raise ValueError("dataset revision must be a full commit SHA")
    _ensure_empty(output)
    relative = Path("runs") / run_id
    target = output / "payload" / relative
    for name in ("manifest.json", "attempts.jsonl", "grades.jsonl", "report.json"):
        _copy_exact(run_dir / name, target / name)
    write_json(target / "publication.json", approval)
    evidence = export_evidence(run_dir, target / "evidence.zip")
    if verify_evidence(evidence)["run_id"] != run_id:
        raise ValueError("evidence run ID mismatch")
    with zipfile.ZipFile(evidence) as archive:
        (target / "evidence-manifest.json").write_bytes(archive.read("evidence-manifest.json"))
    suite = manifest["suite"]
    suite_path = f"suites/{suite['id']}/{suite['version']}"
    cases_file = suite.get("cases_file", "cases.jsonl")
    reproduction = {
        "schema_version": "1",
        "run_id": run_id,
        "arena": {
            "git_repository": "https://github.com/najdresearch/najd-arena",
            "git_revision": run_revision,
            **manifest.get(
                "environment",
                {
                    "python": platform.python_version(),
                    "platform": platform.platform(),
                    "lockfile": None,
                    "lockfile_sha256": None,
                },
            ),
        },
        "dataset": {
            "repo_id": DATASET_REPO,
            "revision": dataset_revision,
            "path": suite_path,
            "cases_file": cases_file,
            "cases_sha256": manifest["cases_digest"],
        },
        "provider": manifest["provider"],
        "experiment": manifest["experiment"],
        "determinism": {
            "artifact_verification": "byte-exact",
            "inference": "provider-dependent",
        },
        "commands": [
            f"git checkout {run_revision}",
            "uv sync --frozen --extra publish",
            "najd-arena verify evidence.zip",
        ],
    }
    write_json(target / "reproduction.json", reproduction)
    checksums = {
        path.name: file_digest(path)
        for path in sorted(target.iterdir())
        if path.is_file() and path.name != "checksums.json"
    }
    write_json(target / "checksums.json", {"schema_version": "1", "files": checksums})
    (output / "payload" / "README.md").write_text(_results_card(), encoding="utf-8")
    return _finish_release(
        output,
        kind="run",
        repo_id=RESULTS_REPO,
        immutable_prefix=relative.as_posix(),
        identity={
            "run_id": run_id,
            "source_revision": run_revision,
            "approval_revision": git["revision"],
        },
        dependency={
            "repo_id": DATASET_REPO,
            "revision": dataset_revision,
            "path": suite_path,
            "cases_file": cases_file,
            "cases_digest": manifest["cases_digest"],
        },
    )


def _remote_file_digest(repo_id: str, revision: str, path: str) -> str:
    from huggingface_hub import hf_hub_download

    downloaded = hf_hub_download(
        repo_id=repo_id, repo_type="dataset", revision=revision, filename=path
    )
    return file_digest(Path(downloaded))


def publish_release(staging: Path) -> dict[str, Any]:
    try:
        from huggingface_hub import CommitOperationAdd, HfApi
    except ImportError as error:
        raise RuntimeError("install Najd Arena with the 'publish' extra") from error

    release = read_json(staging / "release.json")
    payload = staging / "payload"
    actual = {
        path.relative_to(payload).as_posix(): file_digest(path)
        for path in sorted(payload.rglob("*"))
        if path.is_file()
    }
    if actual != release["files"] or digest(actual) != release["content_digest"]:
        raise ValueError("staging payload does not match release.json")
    _scan_payload(payload)
    api = HfApi(token=os.environ.get("HF_TOKEN"))
    api.create_repo(
        repo_id=release["repo_id"], repo_type="dataset", private=False, exist_ok=True
    )
    info = api.repo_info(repo_id=release["repo_id"], repo_type="dataset")
    if getattr(info, "private", False):
        raise ValueError(f"publication repository must be public: {release['repo_id']}")
    remote_files = set(api.list_repo_files(repo_id=release["repo_id"], repo_type="dataset"))
    prefix = release["immutable_prefix"] + "/"
    existing = sorted(path for path in remote_files if path.startswith(prefix))
    expected = sorted(path for path in actual if path.startswith(prefix))
    if existing:
        if existing != expected or any(
            _remote_file_digest(release["repo_id"], info.sha, path) != actual[path]
            for path in expected
        ):
            raise ValueError(f"immutable remote path already differs: {release['immutable_prefix']}")
        receipt = {
            "status": "unchanged",
            "repo_id": release["repo_id"],
            "revision": info.sha,
            "content_digest": release["content_digest"],
        }
        write_json(staging / "publish-receipt.json", receipt)
        return receipt
    if release["kind"] == "run":
        dependency = release["dataset_dependency"]
        remote_cases = f"{dependency['path']}/{dependency['cases_file']}"
        if (
            _remote_file_digest(dependency["repo_id"], dependency["revision"], remote_cases)
            != dependency["cases_digest"]
        ):
            raise ValueError("published dataset dependency does not match the run")
    operations = [
        CommitOperationAdd(path_in_repo=path, path_or_fileobj=payload / path)
        for path in sorted(actual)
    ]
    commit = api.create_commit(
        repo_id=release["repo_id"],
        repo_type="dataset",
        operations=operations,
        commit_message=f"Publish Najd Arena {release['kind']} {release['immutable_prefix']}",
        parent_commit=info.sha,
    )
    tag = (
        f"{release['suite_id']}-v{release['suite_version']}"
        if release["kind"] == "dataset"
        else f"run-{release['run_id']}"
    )
    api.create_tag(
        repo_id=release["repo_id"], repo_type="dataset", tag=tag, revision=commit.oid,
        exist_ok=True,
    )
    receipt = {
        "status": "published",
        "repo_id": release["repo_id"],
        "revision": commit.oid,
        "url": commit.commit_url,
        "tag": tag,
        "content_digest": release["content_digest"],
    }
    write_json(staging / "publish-receipt.json", receipt)
    return receipt
