# Najd Arena

Najd Arena is a reproducible, evidence-first evaluation engine for models and agents. Arabic and Saudi evaluation are its deepest specialization.

This v0.1 repository contains the local engine and a guarded workflow for publishing approved,
reproducible artifacts. It does not contain the historical HUMAIN M3 run, restricted datasets,
a hosted service, or a public leaderboard.

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

## Public releases

Public suites are stored in `najdresearch/najd-arena`; full run evidence is stored in
`najdresearch/najd-arena-results`. Preparing a release is offline and never uploads anything.
It requires a clean Git worktree and a publication approval that validates against
`schemas/v1/publication.schema.json`.

```bash
pip install -e '.[publish]'
najd-arena release prepare-dataset examples/acceptance \
  --approval examples/acceptance/publication.json \
  --output dist/acceptance-1.0.0
najd-arena release publish dist/acceptance-1.0.0
```

The publish receipt contains the immutable dataset commit. Use that full commit SHA to prepare
a completed, graded run after creating a run-specific approval:

```bash
najd-arena release prepare-run RUN_ID \
  --approval path/to/run-publication.json \
  --dataset-revision FULL_DATASET_COMMIT_SHA \
  --output dist/RUN_ID
najd-arena release publish dist/RUN_ID
```

Authenticate with `hf auth login` or `HF_TOKEN`. Tokens are never accepted as command-line
arguments. Publishing is idempotent when the remote content is identical and fails if an
existing suite version or run ID differs. A result release also verifies that its exact input
digest exists at the pinned dataset commit before uploading.
