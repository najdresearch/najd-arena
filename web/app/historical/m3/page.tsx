import type { Metadata } from "next";
import { historicalM3Experiment } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "HUMAIN M3 vs MiniMax M3 — historical study",
  description: "A verified, historical Najd Research comparison across 6,089 case IDs and 28 configurations.",
};

function rate(acceptable: number, total: number) {
  return total ? `${(100 * acceptable / total).toFixed(2)}%` : "—";
}

export default async function HistoricalM3Page() {
  const study = await historicalM3Experiment().catch(() => null);
  if (!study) return <main className="shell historical"><div className="eyebrow">Historical study</div>
    <h1>Results unavailable</h1><p className="lede">The archived experiment has not been imported into this Arena database.</p>
  </main>;

  const modelName: Record<string, string> = { humain: "HUMAIN M3", minimax: "MiniMax M3" };
  const totalGrades = study.models.reduce((sum, model) => sum + model.total, 0);
  const technical = study.models.reduce((sum, model) => sum + model.technical, 0);
  return <main className="shell historical">
    <section className="mast"><div><div className="eyebrow">Najd Research · historical pre-audit study</div>
      <h1>HUMAIN M3 vs MiniMax M3</h1></div>
      <div className="stat"><strong>{study.caseCount.toLocaleString()}</strong>case IDs in every configuration</div>
    </section>
    <p className="lede">A comparison across {study.configurationCount} configurations and {totalGrades.toLocaleString()} graded outputs. The headline uses all {study.caseCount.toLocaleString()} cases for each configuration, including quarantined cases and technical failures.</p>
    <div className="historical-scores">{study.models.map((model) => <div className="panel historical-score" key={model.name}>
      <div className="eyebrow">{modelName[model.name] ?? model.name}</div>
      <strong>{rate(model.acceptable, model.total)}</strong>
      <span>{model.acceptable.toLocaleString()} acceptable / {model.total.toLocaleString()} outputs</span>
      <small>{model.configurations} configurations · {model.technical} technical failures</small>
    </div>)}</div>
    <div className="notice historical-disclosure"><strong>Read this before sharing.</strong> {study.disclosure} The published dataset has the same case IDs, but this experiment used earlier case contents. These scores are archived research results, not a run of the exact <a href="https://huggingface.co/datasets/najdresearch/najd-benchmark">Hugging Face release</a> and not a certified Arena leaderboard result.</div>
    <section className="historical-section"><h2>How the score was counted</h2>
      <p className="lede">“Correct” and “possible correct” count as acceptable. Every other grade, including a technical failure, stays in the denominator and contributes zero. Each model ran all {study.caseCount.toLocaleString()} case IDs in 14 configurations.</p>
      <div className="historical-facts">
        <div><strong>{totalGrades.toLocaleString()}</strong><span>total model outputs</span></div>
        <div><strong>{technical.toLocaleString()}</strong><span>technical failures</span></div>
        <div><strong>{study.promptMismatchCount.toLocaleString()}</strong><span>prompts differ from published release</span></div>
        <div><strong>{study.expectedMismatchCount.toLocaleString()}</strong><span>expected answers differ from published release</span></div>
      </div>
    </section>
    <section className="historical-section"><h2>Configuration results</h2>
      <p className="lede">Each row covers {study.caseCount.toLocaleString()} case IDs. Results here help identify which prompting and reasoning settings changed the outcome.</p>
      <div className="historical-table-wrap"><table className="leaderboard historical-table"><thead><tr><th>Model</th><th>Prompt</th><th>Reasoning</th><th>Full score</th><th>Acceptable</th><th>Technical</th></tr></thead><tbody>
        {study.configurations.map((config) => {
          const [, prompt, reasoning] = config.name.split("--");
          return <tr key={config.name}><td>{modelName[config.model] ?? config.model}</td><td>{prompt}</td><td>{reasoning}</td><td className="score">{rate(config.acceptable, config.total)}</td><td>{config.acceptable.toLocaleString()} / {config.total.toLocaleString()}</td><td>{config.technical}</td></tr>;
        })}
      </tbody></table></div>
    </section>
    <section className="historical-section"><h2>Provenance</h2>
      <p className="lede">The archived grade snapshot was verified against its checksums before import. It contains one grade for each of {study.caseCount.toLocaleString()} case IDs in all {study.configurationCount} configurations. The <a href={study.reportUrl}>earlier PDF report</a> documents an older snapshot and its figures differ from this page. The case ID inventory was checked against the <a href={`https://huggingface.co/datasets/najdresearch/najd-benchmark/tree/${study.datasetRevision}`}>pinned Hugging Face release</a>.</p>
    </section>
  </main>;
}
