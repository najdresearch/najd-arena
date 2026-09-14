# Security

Report vulnerabilities privately through GitHub Security Advisories for this repository.

Do not place provider credentials in experiment files, provider configuration, logs, run artifacts, or evidence bundles. Provider configuration stores only the environment-variable name that supplies a credential at runtime.

Release preparation scans JSON and JSONL for credential-like fields, known token formats, and
local home-directory paths. This is a backstop, not a substitute for the required named privacy
review. Run approvals must explicitly confirm that raw prompts, outputs, usage records, and error
messages are safe to publish.

Najd Arena v0.1 is a local engine. It does not provide tenant isolation, a hosted credential store, or a safe service for untrusted users.
