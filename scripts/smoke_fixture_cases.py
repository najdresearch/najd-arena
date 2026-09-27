"""Live, paid OpenRouter smoke test; requires OPENROUTER_API_KEY. Development only."""

import asyncio, json
from pathlib import Path
from najd_arena.models import ModelConfig
from najd_arena.providers import LiteLLMProvider
from najd_arena.engine import _judge
from najd_arena.adapters import adapt
from najd_arena.metrics import deterministic_grade
from najd_benchmark.fixtures import run_fixture
from najd_arena.dataset import fetch_benchmark, fixture_files

benchmark = fetch_benchmark()
rows = benchmark.cases
config = ModelConfig(
    "smoke",
    "openai/qwen/qwen3-30b-a3b-instruct-2507",
    "https://openrouter.ai/api/v1",
    "OPENROUTER_API_KEY",
    0,
    2048,
)
provider = LiteLLMProvider(config)


async def invoke(messages):
    r = await provider.invoke(messages)
    return {"content": r.content, "model": r.model, "usage": r.usage}


async def one(c):
    if c.fixture:
        files = fixture_files(benchmark, c)
        result = await run_fixture(c.prompt, files, invoke)
        grade = deterministic_grade(c, result["output"], fixture_result=result)
        if grade is None:
            grade = await _judge(
                c,
                result["output"],
                config,
                evidence={"source_files": files, "execution": result},
            )
    else:
        r = await provider.invoke(adapt(c).messages)
        result = {"output": r.content, "usage": r.usage, "model": r.model}
        grade = deterministic_grade(c, r.content)
    record = {"id": c.id, "result": result, "grade": grade}
    Path(".najd-arena-v1/fixture-smoke").mkdir(parents=True, exist_ok=True)
    Path(".najd-arena-v1/fixture-smoke", c.id + ".json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2)
    )
    print(c.id, grade["score"], grade["method"], flush=True)


async def main():
    for c in rows:
        if c.fixture or c.provenance.get("correction_version"):
            await one(c)


asyncio.run(main())
