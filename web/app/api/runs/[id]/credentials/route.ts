import { createClient } from "redis";
import { z } from "zod";
import { pool } from "@/lib/db";
import { authorizedRun } from "@/lib/run-access";
import { encryptCredential } from "@/lib/security";

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{id: string}> }) {
  const { id } = await params;
  const access = await authorizedRun(id, true);
  if (!access) return Response.json({ error: "Run not found." }, { status: 404 });
  if (access.run.status !== "needs_credentials")
    return Response.json({ error: "Run is not waiting for replacement credentials." }, { status: 409 });
  const body = schema.safeParse(await request.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });
  const secret = encryptCredential(body.data.token, access.run.organization_id, id);
  await pool.query(`UPDATE run_credentials SET ciphertext=$2,nonce=$3,auth_tag=$4,key_id=$5,
    deleted_at=NULL,created_at=now() WHERE run_id=$1`,
    [id, secret.ciphertext, secret.nonce, secret.tag, secret.keyId]);
  await pool.query("UPDATE runs SET status='running_inference',updated_at=now() WHERE id=$1", [id]);
  const client = createClient({ url: process.env.REDIS_URL });
  try { await client.connect(); await client.xAdd("arena:orchestration", "*", {type: "resume_run", run_id: id}); }
  finally { if (client.isOpen) await client.quit(); }
  return Response.json({ id, status: "running_inference" });
}
