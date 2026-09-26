import { requireAdmin } from "@/lib/admin";
import { pool } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{id: string}> }) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Najd administrator access required." }, { status: 403 });
  const { id } = await params;
  const result = await pool.query(`UPDATE runs SET status='published', published_at=now(), updated_at=now()
    WHERE id=$1 AND status='awaiting_review' AND completed_cases=total_cases AND coverage=1
    RETURNING id`, [id]);
  if (!result.rowCount) return Response.json({ error: "Run is not eligible for publication." }, { status: 409 });
  await pool.query(`INSERT INTO run_reviews(run_id, reviewer_id, decision, reason)
    VALUES ($1,$2,'published','Canonical run approved by Najd reviewer')`, [id, admin.id]);
  await pool.query(`INSERT INTO audit_events(actor_id,run_id,action) VALUES ($1,$2,'run.published')`, [admin.id, id]);
  if (request.headers.get("content-type")?.includes("application/x-www-form-urlencoded"))
    return Response.redirect(new URL("/admin", request.url), 303);
  return Response.json({ id, status: "published" });
}
