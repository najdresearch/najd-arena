import { randomUUID } from "node:crypto";
import { createClient } from "redis";
import { z } from "zod";
import { auth } from "@/auth";
import { datasetRelease } from "@/lib/dataset-release";
import { pool } from "@/lib/db";
import { encryptCredential, validatePublicEndpoint } from "@/lib/security";

const requestSchema = z.object({
  organizationId: z.string().uuid(), endpointUrl: z.string().url(), token: z.string().min(1),
  modelId: z.string().min(1).max(200), displayName: z.string().min(1).max(200),
  concurrency: z.number().int().min(1).max(64).default(8),
  rpm: z.number().int().min(1).max(100_000).default(60),
  tpm: z.number().int().min(1).max(100_000_000).default(100_000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Authentication required." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const membership = await pool.query(`
    SELECT o.approved, o.active_run_limit, m.role,
      (SELECT count(*) FROM runs r WHERE r.organization_id=o.id AND
        r.status IN ('queued','validating_endpoint','running_inference','grading','aggregating')) active_runs,
      o.monthly_run_limit,
      (SELECT count(*) FROM runs r WHERE r.organization_id=o.id AND
        r.created_at >= date_trunc('month', now())) monthly_runs
    FROM organizations o JOIN organization_memberships m ON m.organization_id=o.id
    WHERE o.id=$1 AND m.user_id=$2 AND m.verified_at > now() - interval '24 hours'`,
    [input.organizationId, session.user.id]);
  const access = membership.rows[0];
  if (!access || !["admin", "runner"].includes(access.role))
    return Response.json({ error: "Runner access is required." }, { status: 403 });
  if (!access.approved) return Response.json({ error: "Organization is awaiting Najd approval." }, { status: 403 });
  if (Number(access.active_runs) >= Number(access.active_run_limit))
    return Response.json({ error: "Organization active-run quota reached." }, { status: 429 });
  if (Number(access.monthly_runs) >= Number(access.monthly_run_limit))
    return Response.json({ error: "Organization monthly run quota reached." }, { status: 429 });
  let endpointUrl: string;
  try { endpointUrl = await validatePublicEndpoint(input.endpointUrl); }
  catch (error) { return Response.json({ error: String(error) }, { status: 400 }); }
  const runId = randomUUID();
  const secret = encryptCredential(input.token, input.organizationId, runId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO runs
      (id, organization_id, created_by, status, model_display_name, model_id, endpoint_url,
       concurrency, rpm, tpm, dataset_version, dataset_revision, total_cases)
      VALUES ($1,$2,$3,'queued',$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [runId, input.organizationId, session.user.id, input.displayName, input.modelId,
       endpointUrl, input.concurrency, input.rpm, input.tpm,
       datasetRelease.version, datasetRelease.revision, datasetRelease.caseCount]);
    await client.query(`INSERT INTO run_credentials
      (run_id, ciphertext, nonce, auth_tag, key_id) VALUES ($1,$2,$3,$4,$5)`,
      [runId, secret.ciphertext, secret.nonce, secret.tag, secret.keyId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
  const redis = createClient({ url: process.env.REDIS_URL });
  redis.on("error", () => undefined);
  try {
    await redis.connect();
    await redis.xAdd("arena:orchestration", "*", { type: "prepare_run", run_id: runId });
  } finally { if (redis.isOpen) await redis.quit(); }
  return Response.json({ runId, status: "queued" }, { status: 202 });
}
