import { auth } from "@/auth";
import { pool } from "@/lib/db";

export async function authorizedRun(runId: string, write = false) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const result = await pool.query(`SELECT r.*,m.role FROM runs r JOIN organization_memberships m
    ON m.organization_id=r.organization_id WHERE r.id=$1 AND m.user_id=$2`,
    [runId, session.user.id]);
  const run = result.rows[0];
  if (!run || (write && !["admin", "runner"].includes(run.role))) return null;
  return { run, user: session.user };
}
