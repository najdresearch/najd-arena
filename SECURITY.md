# Security

Report vulnerabilities privately through GitHub Security Advisories for this repository.

Do not place provider credentials in configuration, logs, queue payloads, run artifacts, or result bundles. The local TUI stores only the environment-variable name supplying a credential.

Hosted target tokens are encrypted with AES-256-GCM and authenticated with their organization and run identifiers. Workers receive database identifiers, decrypt only while performing inference, and erase the ciphertext when inference finishes. OAuth access tokens are discarded after organization membership synchronization.

Hosted endpoints are restricted to public HTTPS addresses and revalidated by workers. Production deployments must additionally enforce outbound network policy. Raw case outputs remain private to the organization and Najd reviewers; only reviewed aggregate summaries are public.
