import { Leaderboard } from "@/components/Leaderboard";
import { publishedRuns } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const runs = await publishedRuns().catch(() => []);
  return <main className="shell"><section className="mast"><div>
    <div className="eyebrow">Canonical results</div><h1>Leaderboard.</h1></div>
    <p className="lede">Ranked by the macro-average of all 21 tracks. Every result completes the same 5,717 certified cases.</p>
  </section><Leaderboard runs={runs} /></main>;
}
