# Arena server deployment

The first server deployment runs the Next.js application with PostgreSQL, Redis, and Caddy HTTPS at `najdarena.com`. The historical study is read from PostgreSQL at `/historical/m3`. This is a Node.js deployment, not a static export.

## Before deployment

Check the reachable server's operating system, free disk and memory, Docker version, existing containers, and listeners on ports 80/443. Reuse its existing reverse proxy if present; do not replace another site's listener with Caddy.

Copy `infra/production.env.example` to `infra/production.env` with mode `600`. Generate unique secrets, set the database password in both `POSTGRES_PASSWORD` and `DATABASE_URL`, and set `AUTH_URL=https://najdarena.com`. Use a hex database password to avoid URL escaping mistakes. The secret file is excluded from Git and Docker build context.

GitHub and Hugging Face login require production OAuth client credentials. Their callback paths are `/api/auth/callback/github` and `/api/auth/callback/huggingface`. Organization run submission additionally requires the evaluation workers, object storage, judge configuration, and organization quota approval. The initial production Compose file does not enable evaluation workers; do not approve run quotas until those services are configured and verified.

## Launch

Run from the repository root after populating `infra/production.env`:

```sh
docker compose --env-file infra/production.env -f infra/docker-compose.production.yml up -d --build
```

Migrations run before the application starts. Caddy waits for `/api/health` to confirm database connectivity. PostgreSQL is reachable only on server loopback port 55432; Redis has no published port.

## Import the historical study

Keep the raw snapshot on the original machine. Forward a local port to the production database with SSH, then run `tui/scripts/seed_historical_m3.py` locally using that tunnel and the production database password. The importer sends only grade records and metadata. Never copy the original evidence files into the web image or public assets.

Verify 170,492 imported grade rows, 6,089 distinct case IDs, 28 configurations, and headline rates of 65.93% and 64.48%. Check the historical-content disclosure is rendered beside the results.

## DNS

After registration and confirmation of the reachable server's public address:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | Verified server IPv4 address |
| CNAME | `www` | `najdarena.com` (optional; add a matching redirect host to Caddy) |

Start with DNS-only records while verifying Caddy certificate issuance. Do not add an AAAA record unless the server has working public IPv6. Confirm the live HTTPS app and the historical study before declaring deployment complete.

## Evidence and rollback

Record the deployed commit or image digest, successful migrations, health response, and HTTPS checks. Back up PostgreSQL before subsequent migrations. Roll back the application image independently; do not automatically reverse or delete database migrations. Persist the PostgreSQL and Caddy volumes across deployments.

## Cranl handoff — September 26

- Target domain: `najdarena.com`, purchased and managed in Cloudflare.
- Repository: `najdresearch/najd-arena`, branch `codex/deploy-cranl`.
- Use root Dockerfile, port 3000; persistent PostgreSQL already exists in Cranl as `najd-arena-db` under the Najd Arena project.
- Set `DATABASE_URL` to its application connection string, `AUTH_URL=https://najdarena.com`, `AUTH_TRUST_HOST=true`, and a generated `AUTH_SECRET` in Cranl secret environment configuration.
- First launch: `ARENA_SEED_HISTORICAL=true` runs the verified seed and database catalog import. Verify 28 configurations and 170,492 total outputs; then turn the flag off.
- Public model metadata and metrics are now database-backed. See `database-result-catalog.md` for visibility and Evaluation as a Service milestones.
- Current blocker: GitHub installation 165102060 is installed for `najdresearch/najd-arena`, but Cranl's Najd Arena workspace lists only the inherited ma7dev connection. Sync succeeds but does not add the organization installation. The app has not been created and DNS has not been changed. Reconcile the existing installation in Cranl before creating the app.
- Obtain the custom-domain target from the created app; do not guess an A record or CNAME. Verify TLS and live results after adding Cloudflare DNS.
