import { requireAdmin } from "@/lib/admin";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) return <main className="shell"><div className="empty">Najd administrator access required.</div></main>;
  const result = await pool.query(`SELECT r.id,r.model_display_name,r.completed_cases,r.total_cases,
    r.coverage,o.name organization FROM runs r JOIN organizations o ON o.id=r.organization_id
    WHERE r.status='awaiting_review' ORDER BY r.completed_at`);
  const organizations = await pool.query(`SELECT id,name,provider,slug FROM organizations
    WHERE approved=false ORDER BY created_at`);
  return <main className="shell"><section className="mast"><div><div className="eyebrow">Najd operations</div><h1>Review runs.</h1></div></section>
    <section style={{padding: "2rem 0"}}><div className="eyebrow">Organization approvals</div>{organizations.rows.length ? organizations.rows.map(org => <div className="run-row" key={org.id}><div><strong>{org.name}</strong><div className="meta">{org.provider} · {org.slug}</div></div>
      <form action={`/api/admin/organizations/${org.id}/approve`} method="post" style={{display: "flex", gap: ".5rem"}}><input aria-label="Active runs" name="activeRunLimit" type="number" min="1" defaultValue="1" style={{width: "4rem"}} /><input aria-label="Monthly runs" name="monthlyRunLimit" type="number" min="1" defaultValue="4" style={{width: "4rem"}} /><button className="button" type="submit">Approve</button></form></div>) : <div className="empty">No organizations await approval.</div>}</section>
    <section style={{paddingBottom: "5rem"}}><div className="eyebrow">Run reviews</div>{result.rows.length ? result.rows.map(run => <div className="run-row" key={run.id}><div><strong>{run.model_display_name}</strong>
      <div className="meta">{run.organization} · {run.completed_cases}/{run.total_cases} · {(Number(run.coverage) * 100).toFixed(1)}% coverage</div></div>
      <form action={`/api/admin/runs/${run.id}/publish`} method="post"><button className="button" type="submit">Publish</button></form></div>) : <div className="empty">No runs are awaiting review.</div>}</section></main>;
}
