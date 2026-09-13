from __future__ import annotations

import argparse
import json
from pathlib import Path

from .canonical import read_json, write_json
from .engine import create_run, execute_run, grade_run, report_run, validate_dataset
from .evidence import export_evidence, verify_evidence


def _root() -> Path:
    return Path.cwd()


def main() -> None:
    parser = argparse.ArgumentParser(prog="najd-arena")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("init")
    provider = commands.add_parser("provider")
    provider_commands = provider.add_subparsers(dest="provider_command", required=True)
    add = provider_commands.add_parser("add")
    add.add_argument("name")
    add.add_argument("--plugin", choices=["openai-compatible", "recorded"], required=True)
    add.add_argument("--model", required=True)
    add.add_argument("--base-url")
    add.add_argument("--api-key-env")
    add.add_argument("--responses-file")
    dataset = commands.add_parser("dataset")
    dataset_commands = dataset.add_subparsers(dest="dataset_command", required=True)
    validate = dataset_commands.add_parser("validate")
    validate.add_argument("path", type=Path)
    run = commands.add_parser("run")
    run.add_argument("experiment", type=Path)
    resume = commands.add_parser("resume")
    resume.add_argument("run_id")
    retry = commands.add_parser("retry")
    retry.add_argument("run_id")
    grade = commands.add_parser("grade")
    grade.add_argument("run_id")
    report = commands.add_parser("report")
    report.add_argument("run_id")
    evidence = commands.add_parser("evidence")
    evidence_commands = evidence.add_subparsers(dest="evidence_command", required=True)
    export = evidence_commands.add_parser("export")
    export.add_argument("run_id")
    export.add_argument("--output", type=Path, required=True)
    verify = commands.add_parser("verify")
    verify.add_argument("bundle", type=Path)
    args = parser.parse_args()
    root = _root()

    if args.command == "init":
        state = root / ".najd-arena"
        state.mkdir(exist_ok=True)
        path = state / "providers.json"
        if not path.exists():
            write_json(path, {})
        print(path)
    elif args.command == "provider" and args.provider_command == "add":
        path = root / ".najd-arena" / "providers.json"
        providers = read_json(path) if path.exists() else {}
        providers[args.name] = {
            key: value
            for key, value in {
                "plugin": args.plugin,
                "model": args.model,
                "base_url": args.base_url,
                "api_key_env": args.api_key_env,
                "responses_file": args.responses_file,
            }.items()
            if value is not None
        }
        write_json(path, providers)
        print(args.name)
    elif args.command == "dataset":
        print(json.dumps(validate_dataset(args.path.resolve()), ensure_ascii=False))
    elif args.command == "run":
        print(create_run(root, args.experiment.resolve()))
    elif args.command == "resume":
        execute_run(root, args.run_id, retry_failed=False)
        print(args.run_id)
    elif args.command == "retry":
        execute_run(root, args.run_id, retry_failed=True)
        print(args.run_id)
    elif args.command == "grade":
        print(grade_run(root, args.run_id))
    elif args.command == "report":
        print(report_run(root, args.run_id))
    elif args.command == "evidence":
        run_dir = root / ".najd-arena" / "runs" / args.run_id
        print(export_evidence(run_dir, args.output.resolve()))
    elif args.command == "verify":
        print(json.dumps(verify_evidence(args.bundle.resolve()), ensure_ascii=False))


if __name__ == "__main__":
    main()
