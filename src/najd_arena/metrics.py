from __future__ import annotations

import json
from typing import Any

from .models import Case


def _normalized(value: str) -> str:
    return " ".join(value.casefold().split())


def score(case: Case, output: Any) -> dict[str, Any]:
    if case.task_type == "exact_match":
        actual = output if isinstance(output, str) else json.dumps(output, ensure_ascii=False)
        passed = _normalized(actual) == _normalized(str(case.expected["text"]))
    elif case.task_type == "json":
        parsed = json.loads(output) if isinstance(output, str) else output
        passed = parsed == case.expected["value"]
    elif case.task_type == "tool_call":
        parsed = json.loads(output) if isinstance(output, str) else output
        passed = (
            parsed.get("name") == case.expected["name"]
            and parsed.get("arguments") == case.expected["arguments"]
        )
    elif case.task_type == "grounded_qa":
        actual = output if isinstance(output, str) else output.get("text", "")
        citations = output.get("citations", []) if isinstance(output, dict) else []
        passed = _normalized(str(case.expected["answer"])) in _normalized(actual) and all(
            citation in citations for citation in case.expected["citations"]
        )
    else:
        raise ValueError(f"no compatible metric for task type {case.task_type!r}")
    return {"metric": f"{case.task_type}@1", "score": 1.0 if passed else 0.0, "passed": passed}
