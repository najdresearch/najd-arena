from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from huggingface_hub import hf_hub_download
from jsonschema import Draft202012Validator
from najd_benchmark.arabic_mmlu import validate_cases as validate_arabic_mmlu_cases
from najd_benchmark.release import DATASET_REVISION, DATASET_VERSION
from platformdirs import user_cache_path

from .models import Benchmark, BenchmarkCase

REPO_ID = "najdresearch/najd-benchmark"
DEFAULT_VERSION = DATASET_VERSION
DEFAULT_REVISION = DATASET_REVISION


def _sha256(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def _json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def fetch_benchmark(
    *, version: str = DEFAULT_VERSION, revision: str = DEFAULT_REVISION
) -> Benchmark:
    prefix = f"datasets/najd-benchmark/{version}"
    cache_dir = user_cache_path("najd-arena") / "huggingface"
    files = {
        name: Path(hf_hub_download(REPO_ID, f"{prefix}/{name}", repo_type="dataset",
                                   revision=revision, cache_dir=cache_dir))
        for name in ("manifest.json", "checksums.json", "case.schema.json", "cases.jsonl")
    }
    manifest = _json(files["manifest.json"])
    checksums = _json(files["checksums.json"])["files"]
    expected_digest = checksums.get("cases.jsonl") or checksums.get("cases")
    actual_digest = _sha256(files["cases.jsonl"])
    if not expected_digest or actual_digest != expected_digest:
        raise ValueError("benchmark cases checksum does not match the release manifest")
    validator = Draft202012Validator(_json(files["case.schema.json"]))
    cases: list[BenchmarkCase] = []
    seen: set[str] = set()
    with files["cases.jsonl"].open(encoding="utf-8") as handle:
        for number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            value = json.loads(line)
            errors = list(validator.iter_errors(value))
            if errors:
                raise ValueError(f"invalid benchmark case at line {number}: {errors[0].message}")
            case = BenchmarkCase.from_dict(value)
            if case.id in seen:
                raise ValueError(f"duplicate benchmark case id: {case.id}")
            seen.add(case.id)
            cases.append(case)
    if len(cases) != manifest["case_count"]:
        raise ValueError("benchmark case count does not match the release manifest")
    validate_arabic_mmlu_cases(case.to_dict() for case in cases)
    return Benchmark(manifest["id"], manifest["version"], revision, actual_digest,
                     files["cases.jsonl"].parent, tuple(cases))


def select_cases(
    benchmark: Benchmark, *, tracks: tuple[str, ...] = (), sample: int | None = None
) -> tuple[BenchmarkCase, ...]:
    cases = [case for case in benchmark.cases if not tracks or case.track in tracks]
    cases.sort(key=lambda case: hashlib.sha256(case.id.encode()).hexdigest())
    if sample is not None:
        cases = cases[:sample]
    if not cases:
        raise ValueError("the selected benchmark contains no cases")
    return tuple(cases)


def fixture_files(benchmark: Benchmark, case: BenchmarkCase) -> dict[str, str]:
    """Download only checksum-listed files for this case's pinned fixture."""
    from najd_benchmark.fixtures import safe_path

    if not case.fixture:
        return {}
    safe_path(case.fixture)
    checks = _json(benchmark.root / "checksums.json")["files"]
    prefix = f"fixtures/{case.fixture}/"
    selected = {name: digest for name, digest in checks.items() if name.startswith(prefix)}
    if not selected:
        raise ValueError(f"No verified fixture files for {case.id} at {benchmark.revision}")
    files = {}
    for name, digest in selected.items():
        relative = safe_path(name[len(prefix):])
        path = Path(hf_hub_download(REPO_ID, f"datasets/najd-benchmark/{benchmark.version}/{name}",
                                   repo_type="dataset", revision=benchmark.revision,
                                   cache_dir=user_cache_path("najd-arena") / "huggingface"))
        if _sha256(path) != digest:
            raise ValueError(f"Fixture checksum mismatch: {name}")
        files[relative] = path.read_text(encoding="utf-8")
    return files
