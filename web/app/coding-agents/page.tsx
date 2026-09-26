import { publicEvaluation } from "@/lib/db";
import { ReleaseExplorer } from "@/components/ReleaseExplorer";
export const dynamic="force-dynamic";
export const metadata={title:"Coding evaluations"};
export default async function Page(){const study=await publicEvaluation();return <main className="shell category-page"><div className="eyebrow">Coding agents / Evaluation coverage</div><h1>Coding Agents</h1><p className="lede">Compare models running inside the Pi harness on coding tasks. The results below keep the harness fixed while you explore models and thinking levels.</p><div className="notice">The coding-question subset contains only five case IDs per configuration. It is not a coding-agent leaderboard or a broad measure of software engineering ability.</div>{study?<ReleaseExplorer execution="pi" study={study} initialMetric="coding"/>:<div className="empty">Results are temporarily unavailable.</div>}</main>}
