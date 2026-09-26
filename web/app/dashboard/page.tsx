import { auth, signOut } from "@/auth";
import { LaunchForm } from "@/components/LaunchForm";
import { RunProgress } from "@/components/RunProgress";
import { SignInPanel } from "@/components/SignInPanel";
import { organizationRuns, organizationsForUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) return <main className="shell"><section className="mast"><div>
    <div className="eyebrow">Authenticated evaluation</div><h1>Submit a model</h1></div></section><SignInPanel /></main>;
  const [organizations, runs] = await Promise.all([
    organizationsForUser(session.user.id).catch(() => []), organizationRuns(session.user.id).catch(() => []),
  ]);
  return <main className="shell"><section className="mast"><div><div className="eyebrow">Organization workspace</div>
    <h1>Evaluation workspace</h1></div><div className="stat">Signed in as<br /><strong style={{fontSize: "1.2rem"}}>{session.user.email}</strong>
    <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="chip" type="submit">Sign out</button></form></div></section>
    <section className="panel-grid"><div className="panel"><div className="eyebrow">New canonical run</div><h2 style={{margin: ".6rem 0 1.5rem"}}>Connect an endpoint</h2>
      <LaunchForm organizations={organizations} /></div><aside className="panel"><div className="eyebrow">Run policy</div>
      <p className="lede">The token is encrypted and deleted after inference. Only public HTTPS endpoints are accepted. Evaluations stay private. An organization administrator must approve publication, then at least one Najd Arena admin must approve it. The publication date is recorded when it becomes public.</p></aside></section>
    <section style={{paddingBottom: "5rem"}}><div className="eyebrow">Recent runs</div>{runs.length ? runs.map(run => <RunProgress initial={run} key={run.id} />) : <div className="empty">No runs have been launched for your organizations.</div>}</section>
  </main>;
}
