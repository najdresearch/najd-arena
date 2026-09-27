import Link from "next/link";
import { ReleaseExplorer } from "@/components/ReleaseExplorer";
import { publicEvaluation } from "@/lib/db";
import { categoryPurpose } from "@/lib/category-context";
import { Leaderboard } from "@/components/Leaderboard";
import { publishedRuns } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [runs,study] = await Promise.all([publishedRuns(),publicEvaluation()]);
  return <main className="shell"><section className="mast"><div>
    <div className="eyebrow">Model rankings</div><h1>Leaderboards</h1></div>
    <p className="lede">Compare available model scores. Historical results and Najd-reviewed evaluations use separate protocols and are presented separately.</p>
  </section>{study && <section><ReleaseExplorer ranked study={study}/></section>}<section className="profile-section"><h2>Najd-reviewed evaluations</h2><div className="notice">Najd-reviewed results require all 6,089 cases and use a macro-average across 25 tracks. The historical results above use a different dataset snapshot and scoring protocol.</div><section className="category-purpose"><h2>Why leaderboards matter</h2><p>{categoryPurpose.leaderboard}</p></section><Leaderboard runs={runs} /><Link href="/methodology">Compare evaluation protocols →</Link></section></main>;
}
