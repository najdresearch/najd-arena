from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal

from jsonschema import Draft202012Validator

from .canonical import read_json

TaskType = Literal["exact_match", "json", "tool_call", "grounded_qa"]


@dataclass(frozen=True)
class Case:
    id: str
    task_type: TaskType
    language: str
    input: dict[str, Any]
    expected: dict[str, Any]
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> Case:
        return cls(**value)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class Suite:
    id: str
    version: str
    license: str
    root: Path
    cases: tuple[Case, ...]


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    plugin: Literal["openai-compatible", "recorded"]
    model: str
    base_url: str | None = None
    api_key_env: str | None = None
    responses_file: str | None = None

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> ProviderConfig:
        return cls(**value)


@dataclass(frozen=True)
class Experiment:
    id: str
    suite: str
    provider: str
    max_attempts: int = 2
    temperature: float = 0.0
    max_tokens: int = 1024

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> Experiment:
        return cls(**value)


def _schema_root() -> Path:
    installed = Path(__file__).resolve().parent / "schemas" / "v1"
    if installed.exists():
        return installed
    return Path(__file__).resolve().parents[2] / "schemas" / "v1"


def validate_document(value: dict[str, Any], schema_name: str) -> None:
    schema = read_json(_schema_root() / schema_name)
    Draft202012Validator(schema).validate(value)


def load_suite(path: Path) -> Suite:
    manifest_path = path / "suite.json"
    manifest = read_json(manifest_path)
    validate_document(manifest, "suite.schema.json")
    cases_path = path / manifest["cases_file"]
    cases: list[Case] = []
    seen: set[str] = set()
    for number, line in enumerate(cases_path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        value = __import__("json").loads(line)
        validate_document(value, "case.schema.json")
        case = Case.from_dict(value)
        if case.id in seen:
            raise ValueError(f"duplicate case id {case.id!r} at line {number}")
        seen.add(case.id)
        cases.append(case)
    if not cases:
        raise ValueError("suite contains no cases")
    return Suite(manifest["id"], manifest["version"], manifest["license"], path, tuple(cases))


def load_experiment(path: Path) -> Experiment:
    value = read_json(path)
    validate_document(value, "experiment.schema.json")
    return Experiment.from_dict(value)
