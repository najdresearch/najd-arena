import { Leaderboard } from "@/components/Leaderboard";
import { publishedRuns } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const runs = await publishedRuns().catch(() => []);
  return <main className="shell"><section className="mast">
    <div><div className="eyebrow">Public benchmark · 2026.09.14</div><h1>Measure Arabic intelligence.</h1></div>
    <div className="stat"><strong>5,717</strong>certified cases<br />21 evaluation tracks</div>
  </section><div className="filters"><span className="chip">All tracks</span><span className="chip">Arabic</span>
    <span className="chip">Saudi</span><span className="chip">Agentic</span><span className="chip">Safety</span>
    <span className="chip">Truthfulness</span></div><Leaderboard runs={runs} /></main>;
}
