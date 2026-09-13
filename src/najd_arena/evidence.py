from __future__ import annotations

import tempfile
import zipfile
from pathlib import Path
from typing import Any

from .canonical import file_digest, read_json, write_json


def export_evidence(run_dir: Path, output: Path) -> Path:
    required = ["manifest.json", "attempts.jsonl", "grades.jsonl", "report.json"]
    missing = [name for name in required if not (run_dir / name).exists()]
    if missing:
        raise ValueError(f"run is not ready for export; missing: {', '.join(missing)}")
    manifest = {
        "schema_version": "1",
        "run_id": read_json(run_dir / "manifest.json")["run_id"],
        "files": {name: file_digest(run_dir / name) for name in required},
    }
    with tempfile.TemporaryDirectory() as temporary:
        manifest_path = Path(temporary) / "evidence-manifest.json"
        write_json(manifest_path, manifest)
        output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.write(manifest_path, "evidence-manifest.json")
            for name in required:
                archive.write(run_dir / name, name)
    return output


def verify_evidence(path: Path) -> dict[str, Any]:
    with zipfile.ZipFile(path) as archive, tempfile.TemporaryDirectory() as temporary:
        archive.extractall(temporary)
        root = Path(temporary)
        manifest = read_json(root / "evidence-manifest.json")
        for name, expected in manifest["files"].items():
            actual = file_digest(root / name)
            if actual != expected:
                raise ValueError(f"evidence digest mismatch: {name}")
        return {"status": "pass", "run_id": manifest["run_id"], "files": len(manifest["files"])}
