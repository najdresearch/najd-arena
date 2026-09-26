import Link from "next/link";
import type { PublishedRun } from "@/lib/types";

export function Leaderboard({ runs }: { runs: PublishedRun[] }) {
  if (!runs.length) return <div className="empty"><div className="eyebrow">Awaiting canonical results</div><h3>No Najd-reviewed runs published yet</h3>
    <p>Imported historical results are available above. This separate section is reserved for runs completed under the current evaluation protocol.</p><Link href="/">Explore available model scores →</Link></div>;
  return <table className="leaderboard"><thead><tr><th>Rank</th><th>Model</th><th>Najd score</th>
    <th>Coverage</th><th>Published</th></tr></thead><tbody>{runs.map(run => <tr key={run.id}>
      <td className="rank">{String(run.rank).padStart(2, "0")}</td>
      <td><Link className="model" href={`/runs/${run.id}`}>{run.modelName}</Link>
        <div className="meta">{run.organization} · {run.modelId} · org verified</div></td>
      <td className="score">{(run.score * 100).toFixed(1)}</td>
      <td>{(run.coverage * 100).toFixed(1)}%</td>
      <td className="meta">{new Date(run.publishedAt).toLocaleDateString("en-GB")}</td>
    </tr>)}</tbody></table>;
}
