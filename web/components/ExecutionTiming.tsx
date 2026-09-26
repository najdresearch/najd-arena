"use client";
import {useCatalog} from "./CatalogProvider";
import type {PublicEvaluation} from "@/lib/db";
import {effortLevels} from "@/lib/model-catalog";
import {ProviderLogo} from "./ProviderLogo";
import {useComparison} from "./useComparison";
export function ExecutionTiming({study}:{study:PublicEvaluation}){
 const catalog=useCatalog();
 const modelNames=Object.fromEntries(catalog.map(m=>[m.id,m.displayName]));

 const {prompt,level,setPrompt,setLevel}=useComparison();
 const models=Object.keys(modelNames);
 const supplemental=(m:string)=>study.metrics.find(r=>r.config===study.configurations.find(c=>c.model===m&&c.execution===prompt&&c.thinking===level)?.name);
 return <><div className="overview-settings"><label>Execution<select value={prompt} onChange={e=>setPrompt(e.target.value)}><option value="raw">Direct</option><option value="pi">Pi agent</option></select></label><label>Thinking<select value={level} onChange={e=>setLevel(e.target.value)}>{effortLevels.map(l=><option key={l}>{l}</option>)}</select></label></div> <section id="execution-timing" className="analysis-section timing-section"><div className="section-heading"><div><h2>Recorded execution time</h2><p>Exploratory timing from preserved runs · {prompt==='raw'?'Direct (Raw)':'Pi agent'} · {level} thinking</p></div><span className="status-label">Partial coverage</span></div><p className="analysis-note">Successful, graded records with a positive elapsed time only. Recovery passes and missing timings make this an observed sample, not a standardized speed ranking. It includes execution overhead; it is not time to first token or tokens per second.</p><div className="timing-grid">{models.map(m=>{const r=supplemental(m);return <article key={m}><div><ProviderLogo model={m}/><strong>{modelNames[m]}</strong></div><dl><div><dt>Median</dt><dd>{r?.medianSeconds?.toFixed(2)??'—'}<small> sec</small></dd></div><div><dt>95th percentile</dt><dd>{r?.p95Seconds?.toFixed(2)??'—'}<small> sec</small></dd></div></dl><small>{r?.timedOutputs?.toLocaleString()??'0'} timed outputs / {r?.total.toLocaleString()??'—'} in this configuration</small></article>;})}</div><details className="chart-methodology"><summary>What the records do not measure</summary><p>Provider inference cost, candidate token throughput, and time to first token cannot be reconstructed reliably. The usage fields in the grade file describe the judge, not the candidate model. No cost or token-speed estimate is displayed.</p></details></section></>;
}
