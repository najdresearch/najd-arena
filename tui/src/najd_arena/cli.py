from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

from .dataset import fetch_benchmark
from .engine import list_runs, run_benchmark
from .models import JudgeConfig, ModelConfig, RunConfig
from .tui import launch


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="najd-arena")
    commands = parser.add_subparsers(dest="command")
    run = commands.add_parser("run", help="Run a benchmark without the interactive TUI")
    run.add_argument("--model", required=True)
    run.add_argument("--name")
    run.add_argument("--api-base")
    run.add_argument("--api-key-env")
    run.add_argument("--track", action="append", default=[])
    run.add_argument("--sample", type=int)
    run.add_argument("--concurrency", type=int, default=8)
    run.add_argument("--judge-model")
    run.add_argument("--judge-api-key-env")
    run.add_argument("--judge-api-base")
    run.add_argument("--json", action="store_true")
    commands.add_parser("runs", help="List local runs")
    dataset = commands.add_parser("dataset", help="Fetch and verify the certified benchmark")
    dataset.add_argument("action", choices=["fetch", "verify"])
    return parser


def main() -> None:
    args = _parser().parse_args()
    if args.command is None:
        launch()
        return
    if args.command == "dataset":
        benchmark = fetch_benchmark()
        print(json.dumps({"id": benchmark.id, "version": benchmark.version,
                          "revision": benchmark.revision, "cases": len(benchmark.cases),
                          "sha256": benchmark.cases_sha256}, indent=2))
        return
    if args.command == "runs":
        print(json.dumps(list_runs(Path.cwd()), ensure_ascii=False, indent=2))
        return
    judge = None
    if args.judge_model:
        if not args.judge_api_key_env:
            raise SystemExit("--judge-api-key-env is required with --judge-model")
        judge = JudgeConfig(args.judge_model, args.judge_api_key_env, args.judge_api_base)
    config = RunConfig(
        model=ModelConfig(args.name or args.model, args.model, args.api_base, args.api_key_env),
        judge=judge, tracks=tuple(args.track), sample=args.sample,
        concurrency=args.concurrency,
    )

    def progress(done: int, total: int, case_id: str) -> None:
        if not args.json:
            print(f"\r{done}/{total} {case_id:60}", end="", flush=True)

    run_id = asyncio.run(run_benchmark(Path.cwd(), config, progress=progress))
    if not args.json:
        print()
    print(json.dumps({"run_id": run_id}) if args.json else run_id)


if __name__ == "__main__":
    main()
