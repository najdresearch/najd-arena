from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Literal

RunStatus = Literal["ready", "running", "grading", "complete", "incomplete", "cancelled"]


@dataclass(frozen=True)
class BenchmarkCase:
    id: str
    track: str
    language: str
    prompt: str
    tags: tuple[str, ...]
    expected: dict[str, Any]
    provenance: dict[str, Any]
    audit_issues: tuple[str, ...]
    fixture: str | None = None
    judge_dimensions: tuple[str, ...] = ()
    system_prompt: str | None = None
    dialect: str | None = None

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> BenchmarkCase:
        return cls(
            id=value["id"], track=value["track"], language=value["language"],
            prompt=value["prompt"], tags=tuple(value.get("tags") or ()),
            expected=value["expected"], provenance=value["provenance"],
            audit_issues=tuple(value.get("audit_issues") or ()), fixture=value.get("fixture"),
            judge_dimensions=tuple(value.get("judge_dimensions") or ()),
            system_prompt=value.get("system_prompt"), dialect=value.get("dialect"),
        )

    @property
    def source_id(self) -> str:
        return str(self.provenance.get("sourceId", "unknown"))

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class Benchmark:
    id: str
    version: str
    revision: str
    cases_sha256: str
    root: Path
    cases: tuple[BenchmarkCase, ...]


@dataclass(frozen=True)
class ModelConfig:
    name: str
    model: str
    api_base: str | None = None
    api_key_env: str | None = None
    temperature: float = 0.0
    max_tokens: int = 1024
    timeout_seconds: int = 120


@dataclass(frozen=True)
class JudgeConfig:
    model: str
    api_key_env: str
    api_base: str | None = None
    profile_id: str = "najd-canonical-v1"


@dataclass(frozen=True)
class RunConfig:
    model: ModelConfig
    judge: JudgeConfig | None = None
    tracks: tuple[str, ...] = ()
    sample: int | None = None
    concurrency: int = 8
    rpm: int = 60
    tpm: int = 100_000
    max_attempts: int = 5
