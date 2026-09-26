import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { pool } from "@/lib/db";

const schema = z.object({ activeRunLimit: z.coerce.number().int().min(1).max(100),
  monthlyRunLimit: z.coerce.number().int().min(1).max(10_000) });

export async function POST(request: Request, { params }: { params: Promise<{id: string}> }) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Najd administrator access required." }, { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const parsed = schema.safeParse({ activeRunLimit: form.get("activeRunLimit"),
    monthlyRunLimit: form.get("monthlyRunLimit") });
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  await pool.query("UPDATE organizations SET approved=true,active_run_limit=$2,monthly_run_limit=$3 WHERE id=$1",
                   [id, parsed.data.activeRunLimit, parsed.data.monthlyRunLimit]);
  await pool.query("INSERT INTO audit_events(actor_id,organization_id,action,metadata) VALUES ($1,$2,'organization.approved',$3)",
                   [admin.id, id, JSON.stringify(parsed.data)]);
  return Response.redirect(new URL("/admin", request.url), 303);
}
