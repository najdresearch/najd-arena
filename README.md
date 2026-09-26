# Najd Arena

Najd Arena is the evaluation interface for the certified [Najd Benchmark](https://huggingface.co/datasets/najdresearch/najd-benchmark). It contains two products:

- `tui/` — a local Textual application, scriptable CLI, evaluation runtime, and reusable worker process.
- `web/` — a Next.js leaderboard and authenticated organization workspace.

Shared JSON contracts live in `contracts/`; portable deployment files live in `infra/`. There is no separate application backend: the Next.js app owns HTTP/auth flows and the Python runtime owns queued evaluation work.

## Local TUI

```bash
cd tui
uv sync --extra dev
uv run najd-arena
```

Headless OpenAI-compatible example:

```bash
export LOCAL_MODEL_API_KEY=unused
uv run najd-arena run \
  --model openai/local-model \
  --api-base http://127.0.0.1:8000/v1 \
  --api-key-env LOCAL_MODEL_API_KEY \
  --sample 20
```

Use a LiteLLM model string and its standard environment variable for hosted providers. Add `--judge-model` and `--judge-api-key-env` for full hybrid grading. Without a judge, open-ended cases remain ungraded and the report is non-canonical.

## Web and workers

```bash
cp .env.example .env
# Fill OAuth, credential-encryption, admin, and judge values.
docker compose -f infra/docker-compose.yml up --build
```

Generate `ARENA_CREDENTIAL_KEY` as 32 random bytes encoded with URL-safe base64. Target credentials are encrypted for one run and erased after inference. Hosted endpoints must be public HTTPS URLs.

The first upstream organization syncs on GitHub or Hugging Face sign-in. Organizations begin unapproved with zero quota; approve them and set `active_run_limit` and `monthly_run_limit` in PostgreSQL before they can launch runs.

## Scoring

The runtime pins the certified `2026.09.14` release and verifies its checksum. Source-aware adapters cover all 29 certified sources. Structured, tool-use, instruction-following, and survey tasks use deterministic metrics; open-ended tasks use an immutable judge profile. The public Najd score is the macro-average of 21 track means.

Only complete canonical runs enter the review queue. A Najd administrator must publish a run before it appears publicly. Raw model outputs remain private to the organization and Najd reviewers.

## Historical M3 comparison

The separate `/historical/m3` page reads an archived HUMAIN M3 versus MiniMax M3 experiment from PostgreSQL. Its headline includes all 6,089 case IDs in each of 28 configurations, for 170,492 grade records. Correct and possible-correct grades count as acceptable; technical failures stay in the denominator. This is a historical pre-audit study, not a canonical leaderboard run. The archived prompts and expected answers differ from the published Hugging Face release on some case IDs, and the page discloses the counts.

To import it, apply the database migrations and run `tui/scripts/seed_historical_m3.py` with `--snapshot` pointing to the private archived `preaudit-snapshot-20260909T214500Z` directory and `--release` pointing to the locally verified `2026.09.14` Hugging Face release directory. Pass `--write` and `DATABASE_URL` to seed PostgreSQL. The importer checks both release-file hashes, the snapshot hashes, all case IDs, and complete configuration coverage before writing. It stores only grades and audit metadata, not model answers. Run without `--write` to inspect the verification summary.

The current canonical runner intentionally loads the 5,717 certified cases. The 372 quarantined records need source-specific review, repair, or fixtures before an exact-content 6,089-case rerun can be described as a canonical benchmark result.

## Development

```bash
cd tui && uv run ruff check . && uv run python -m pytest -q
cd ../web && pnpm lint && pnpm build
```
