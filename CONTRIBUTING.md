# Contributing

Start with an issue describing the user problem, expected behavior, evidence and the smallest reviewable change. Never include credentials, private cases, employer material or client data in issues, fixtures or logs.

## Local checks

```sh
pnpm install --frozen-lockfile
pnpm test
```

Use a branch and submit a pull request explaining what changed, why, tests run and known limitations. Include a small original or rights-cleared fixture for behavioral changes. Document breaking schema, scoring or dataset changes and version them; never silently change historical results.

## Review checklist

| Change | Required evidence |
|---|---|
| Dataset/source | Public source, revision/hash, license, transformation, split, lineage and reconstruction check |
| Task/scorer | Versioned contract, label rubric, baseline, denominator, invalid-output policy and uncertainty |
| Runner/API | Failure and retry behavior, secret redaction, reproducible configuration |
| Arena access/publication | Tenant isolation, role checks, exact-result approvals and managed-run provenance |
| Documentation | Copyable commands and an explicit distinction between implemented and planned behavior |

Report data or scoring problems with source/case IDs and a reproducible explanation using public material. Keep proposed corrections separate from immutable historical releases. Report security issues privately using the repository's security policy where available; never post secrets publicly.

## Shared contract consumers

Read [the contract integration guide](docs/shared-contracts.md). Run
`python3 scripts/check_contracts.py`, `pnpm test`, `pnpm web:lint` and `pnpm web:build`.
Schemas are pinned copies from benchmark; never change their meaning in Arena alone.
Private-preview tests must reject unauthenticated access, tampering and oversized uploads.
A claimed managed origin must never enable publication.
