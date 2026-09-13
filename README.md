# Najd Arena

Najd Arena is a reproducible, evidence-first evaluation engine for models and agents. Arabic and Saudi evaluation are its deepest specialization.

This private v0.1 repository contains the local engine only. It does not contain the historical HUMAIN M3 run, restricted datasets, a hosted service, or a public leaderboard.

## Quick start

```bash
python -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
najd-arena init
najd-arena provider add recorded-demo \
  --plugin recorded \
  --model recorded-v1 \
  --responses-file examples/acceptance/responses.json
najd-arena dataset validate examples/acceptance
najd-arena run examples/acceptance/experiment.json
```

Use the returned run ID:

```bash
najd-arena grade RUN_ID
najd-arena report RUN_ID
najd-arena evidence export RUN_ID --output evidence.zip
najd-arena verify evidence.zip
```

For an OpenAI-compatible endpoint, configure only the environment-variable name that contains the secret:

```bash
najd-arena provider add local-model \
  --plugin openai-compatible \
  --model example-model \
  --base-url http://127.0.0.1:8000/v1 \
  --api-key-env LOCAL_MODEL_API_KEY
```

Provider credentials are never stored in project configuration, SQLite, logs, or evidence artifacts.

## Guarantees

- Versioned schemas validate cases, suites, and experiments before execution.
- Run inputs are resolved into an immutable manifest and digest.
- Attempts and grades are append-only evidence.
- Resume skips successful work. Retry adds attempts without overwriting history.
- Metrics are routed by task type.
- Reports use saved artifacts and require no provider access.
- Evidence bundles detect later modification.

See [the artifact model](docs/artifact-model.md) and [dataset licenses](DATASET_LICENSES.md).

