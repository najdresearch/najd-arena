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

SQLite is the local operational index. JSON, JSONL, and content-addressed objects are the portable evidence.

