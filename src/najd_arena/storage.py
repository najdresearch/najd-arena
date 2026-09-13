from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from .canonical import canonical_bytes, digest


class LocalStore:
    def __init__(self, root: Path):
        self.root = root
        self.runs_root = root / "runs"
        self.objects_root = root / "objects" / "sha256"
        self.root.mkdir(parents=True, exist_ok=True)
        self.runs_root.mkdir(parents=True, exist_ok=True)
        self.objects_root.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(root / "state.db")
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS runs "
            "(id TEXT PRIMARY KEY, status TEXT NOT NULL, manifest_path TEXT NOT NULL)"
        )
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS attempts "
            "(run_id TEXT NOT NULL, case_id TEXT NOT NULL, attempt INTEGER NOT NULL, "
            "status TEXT NOT NULL, object_digest TEXT NOT NULL, "
            "PRIMARY KEY (run_id, case_id, attempt))"
        )
        self.connection.commit()

    def put_object(self, value: Any) -> str:
        object_digest = digest(value)
        path = self.objects_root / object_digest
        if not path.exists():
            path.write_bytes(canonical_bytes(value))
        return object_digest

    def append_jsonl(self, path: Path, value: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(value, ensure_ascii=False, sort_keys=True) + "\n")

    def record_run(self, run_id: str, status: str, manifest_path: Path) -> None:
        self.connection.execute(
            "INSERT INTO runs(id, status, manifest_path) VALUES (?, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET status=excluded.status",
            (run_id, status, str(manifest_path)),
        )
        self.connection.commit()

    def record_attempt(
        self, run_id: str, case_id: str, attempt: int, status: str, object_digest: str
    ) -> None:
        self.connection.execute(
            "INSERT INTO attempts(run_id, case_id, attempt, status, object_digest) VALUES (?, ?, ?, ?, ?)",
            (run_id, case_id, attempt, status, object_digest),
        )
        self.connection.commit()
