import { createClient } from "redis";
import { pool } from "@/lib/db";
import { authorizedRun } from "@/lib/run-access";

export async function GET(_: Request, { params }: { params: Promise<{id: string}> }) {
  const { id } = await params;
  const access = await authorizedRun(id);
  if (!access) return Response.json({ error: "Run not found." }, { status: 404 });
  const { endpoint_url: _endpoint, ...safe } = access.run;
  void _endpoint;
  return Response.json(safe);
}

export async function DELETE(_: Request, { params }: { params: Promise<{id: string}> }) {
  const { id } = await params;
  const access = await authorizedRun(id, true);
  if (!access) return Response.json({ error: "Run not found." }, { status: 404 });
  if (access.run.status === "published")
    return Response.json({ error: "Published summaries are immutable." }, { status: 409 });
  await pool.query("UPDATE runs SET status='cancelled',updated_at=now() WHERE id=$1", [id]);
  await pool.query("UPDATE run_credentials SET ciphertext='',nonce='',auth_tag='',deleted_at=now() WHERE run_id=$1", [id]);
  const client = createClient({ url: process.env.REDIS_URL });
  try { await client.connect(); await client.xAdd("arena:orchestration", "*", {type: "delete_run", run_id: id}); }
  finally { if (client.isOpen) await client.quit(); }
  return Response.json({ id, status: "deleting" }, { status: 202 });
}
