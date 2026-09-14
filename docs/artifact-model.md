# Artifact model

Najd Arena keeps scientific evidence separate from mutable job state.

| Record | Rule |
| --- | --- |
| Suite and experiment | Validate against versioned JSON Schema before execution. |
| Run manifest | Resolve the suite, provider, settings, code revision, and input digest once. |
| Attempt | Append one record for each provider attempt. Never replace an earlier attempt. |
| Object | Store canonical response content by SHA-256 digest. |
| Grade | Record the scorer name, version, attempt, score, and pass state. |
| Report | Derive it only from saved attempts and grades. |
| Evidence bundle | Include required files and a manifest of their SHA-256 digests. |
| Publication approval | Name the reviewer and record license, privacy, provenance, and raw-output decisions. |
| Release snapshot | Stage deterministic files and checksums offline before any network operation. |
| Hub version/run path | Treat it as immutable; identical retries are no-ops and changed content is rejected. |

SQLite is the local operational index. JSON, JSONL, and content-addressed objects are the portable evidence.

Evidence ZIP metadata is normalized so exporting the same run twice produces identical bytes.
A published run adds a reproduction record that pins the source revision, dependency lockfile,
dataset Hub commit, provider/model identifiers, and execution settings. Artifact integrity is
byte-exact; repeated inference remains provider-dependent unless the provider itself guarantees
deterministic execution of a pinned model revision.
