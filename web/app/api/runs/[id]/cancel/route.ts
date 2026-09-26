import { pool } from "@/lib/db";
import { authorizedRun } from "@/lib/run-access";

export async function POST(_: Request, { params }: { params: Promise<{id: string}> }) {
  const { id } = await params;
  const access = await authorizedRun(id, true);
  if (!access) return Response.json({ error: "Run not found." }, { status: 404 });
  await pool.query("UPDATE runs SET status='cancelled',updated_at=now() WHERE id=$1 AND status NOT IN ('published','rejected')", [id]);
  await pool.query("UPDATE run_credentials SET ciphertext='',nonce='',auth_tag='',deleted_at=now() WHERE run_id=$1", [id]);
  return Response.json({ id, status: "cancelled" });
}
