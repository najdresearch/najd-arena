import { notFound } from "next/navigation";
import { runById } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await runById(id).catch(() => null);
  if (!run) notFound();
  return <main className="shell"><section className="mast"><div><div className="eyebrow">Published canonical run</div><h1>{run.modelName}</h1>
    <p className="lede">{run.organization} · {run.modelId} · organization-verified identity</p></div><div className="stat"><strong>{(run.score * 100).toFixed(1)}</strong>Najd score<br />{(run.coverage * 100).toFixed(1)}% coverage</div></section>
    <section className="panel-grid"><div className="panel"><h2>Track profile</h2>{run.tracks.map(track => <div className="run-row" key={track.name}><div>{track.name}<div className="meta">{track.cases} cases</div></div><div className="score">{(track.score * 100).toFixed(1)}</div></div>)}</div>
    <aside className="panel"><div className="eyebrow">Reproduction</div><p>Dataset {run.datasetVersion}</p><p>Judge {run.judgeProfile}</p><p>Case weighted {(run.caseWeightedScore * 100).toFixed(1)}</p><p>Published {new Date(run.publishedAt).toLocaleDateString("en-GB")}</p></aside></section></main>;
}
