"use client";
import {useCatalog} from "./CatalogProvider";

import { useState } from "react";
import {ProviderLogo} from "./ProviderLogo";
import type { PublicEvaluation } from "@/lib/db";


const pct = (n: number, d: number) => d ? 100 * n / d : 0;
const pretty = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replaceAll("-", " ");

export function ResultsExplorer({ study }: { study: PublicEvaluation }) {
 const catalog=useCatalog();
 const modelNames=Object.fromEntries(catalog.map(m=>[m.id,m.displayName]));
 const names=modelNames;
 const modelSlug=(id:string)=>catalog.find(m=>m.id===id)?.slug??id;

  const [view, setView] = useState("Tasks");
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("all");
  const [sort, setSort] = useState("score");
  const [selected, setSelected] = useState<string | null>(null);
  const rows = (view === "Tasks" ? study.tracks : study.configurations)
    .filter(r => (model === "all" || r.model === model) && `${pretty(r.name)} ${names[r.model]}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === "score" ? pct(b.acceptable, b.total) - pct(a.acceptable, a.total) : a.name.localeCompare(b.name));
  const models = [...study.models].sort((a, b) => pct(b.acceptable, b.total) - pct(a.acceptable, a.total));
  const [metric, setMetric] = useState("overall");
  const modelScore = (id: string) => {
    const row = metric === "overall" ? study.models.find(r => r.name === id) : study.tracks.find(r => r.model === id && r.name === metric);
    return row ? pct(row.acceptable, row.total) : null;
  };
  const ranked = [...models].sort((a,b) => (modelScore(b.name) ?? -1) - (modelScore(a.name) ?? -1));
  return <>
    <div className="catalog-summary"><div><strong>{models.length}</strong><span>evaluated models</span></div><div><strong>{study.caseCount.toLocaleString()}</strong><span>case IDs per configuration</span></div><div><strong>{study.configurationCount}</strong><span>model configurations</span></div><div><strong>Text</strong><span>evaluated modality</span></div></div>
    <section className="model-index" aria-label="Model comparison"><div className="explorer-heading"><div><h2>Model performance</h2><p>Historical pre-audit results · Higher acceptable rate is better</p></div><label className="metric-select">Rank by<select aria-label="Rank models by" value={metric} onChange={e=>setMetric(e.target.value)}><option value="overall">Overall</option><option value="arabic">Arabic</option><option value="saudi">Saudi</option><option value="rag">Retrieval</option><option value="agentic_tool_use">Tool use</option></select></label></div><div className="table-scroll" tabIndex={0} role="region" aria-label="Results table, scroll horizontally for more columns"><table className="model-index-table"><thead><tr><th scope="col">#</th><th scope="col">Model</th><th scope="col">Acceptable rate</th><th scope="col">Configurations</th><th scope="col">Profile</th></tr></thead><tbody>{ranked.map((m,i)=><tr key={m.name}><td className="index-rank">{i+1}</td><td><a className="model-identity" href={`/models/${modelSlug(m.name)}`}><span className={`model-icon ${m.name}`}><ProviderLogo model={m.name}/></span><span><strong>{names[m.name]}</strong><small>Text model · Imported evaluation</small></span></a></td><td><div className="index-score">{modelScore(m.name)?.toFixed(2) ?? "—"}<span>%</span></div><div className="score-meter"><i style={{width:`${modelScore(m.name) ?? 0}%`}}/></div></td><td>{m.configurations}<small className="index-note">Fixed across both models</small></td><td><a className="profile-link" href={`/models/${modelSlug(m.name)}`}>View results ↗</a></td></tr>)}</tbody></table></div><p className="table-footnote">Ranking reflects the selected task or overall aggregate. It does not establish statistical significance. All configurations remain included.</p></section>
    <details className="result-provenance"><summary>Score scope: historical pre-audit · Result details</summary><p>All {study.caseCount.toLocaleString()} cases are included, including quarantined cases. Acceptable means correct or possible correct. Technical failures count as zero. These scores pool 14 configurations per model.</p><p>{study.disclosure} These are not certified results for the current dataset: {study.promptMismatchCount.toLocaleString()} prompts and {study.expectedMismatchCount.toLocaleString()} expected answers differ.</p><a href={`https://huggingface.co/datasets/najdresearch/najd-benchmark/tree/${study.datasetRevision}`}>Dataset reference ↗</a></details>
    <section className="explorer" aria-label="Interactive results">
      <div className="explorer-heading"><div><h2>Explore the results</h2><p>Find the model and setting that matter to your task.</p></div><div className="segmented" aria-label="Result view">{["Tasks", "Configurations"].map(v => <button key={v} aria-pressed={view === v} onClick={() => {setView(v); setSelected(null);}}>{v}</button>)}</div></div>
      <div className="result-controls"><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search results" placeholder={view === "Tasks" ? "Search tasks or models…" : "Search prompt or reasoning settings…"} value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Filter model" value={model} onChange={e => setModel(e.target.value)}><option value="all">All models</option>{models.map(m => <option key={m.name} value={m.name}>{names[m.name]}</option>)}</select><select aria-label="Sort results" value={sort} onChange={e => setSort(e.target.value)}><option value="score">Highest score</option><option value="name">Name A–Z</option></select></div>
      <div className="results-count" aria-live="polite">{rows.length} results <button onClick={() => {setQuery("");setModel("all");setSort("score");}}>Reset filters</button></div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Results table, scroll horizontally for more columns"><table className="results-table"><thead><tr><th>{view === "Tasks" ? "Task" : "Configuration"}</th><th>Model</th><th>Acceptable rate</th><th>Outputs</th><th>Details</th></tr></thead><tbody>{rows.map(r => {
        const id = `${r.model}:${r.name}`;
        return <tr key={id} className={selected === id ? "expanded-row" : ""}><td><strong>{pretty(r.name.replace(`${r.model}--`, ""))}</strong>{selected === id && <div className="row-details">{r.acceptable.toLocaleString()} acceptable · {r.technical.toLocaleString()} technical failures · {(r.total - r.acceptable - r.technical).toLocaleString()} other non-acceptable outputs. Technical failures count as zero.</div>}</td><td><span className={`tiny-dot ${r.model}`} />{names[r.model]}</td><td><div className="table-score"><strong>{pct(r.acceptable, r.total).toFixed(2)}%</strong><div className="score-meter"><i style={{width:`${pct(r.acceptable,r.total)}%`}} /></div></div></td><td>{r.total.toLocaleString()}</td><td><button className="detail-button" aria-label={`${selected === id ? "Hide" : "Show"} details for ${r.name} ${names[r.model]}`} aria-expanded={selected === id} onClick={() => setSelected(selected === id ? null : id)}>{selected === id ? "−" : "+"}</button></td></tr>;
      })}</tbody></table></div>
      {!rows.length && <div className="empty"><h3>No matching results</h3><p>Try another task name or reset the filters.</p></div>}
      <p className="table-footnote">Acceptable = correct + possible correct, divided by all outputs. Task scores pool all configurations for each model.</p>
    </section>
  </>;
}
