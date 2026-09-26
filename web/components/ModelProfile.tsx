"use client";
import {useCatalog} from "./CatalogProvider";
import { capabilityPurpose, taskPurpose } from "@/lib/category-context";
import { ReleaseExplorer } from "@/components/ReleaseExplorer";
import Link from "next/link";
import { useComparison } from "./useComparison";
import { useState } from "react";
import type { PublicEvaluation } from "@/lib/db";

const rate = (n:number,d:number) => d ? n/d*100 : 0;
const label = (s:string) => s.replace(/([a-z])([A-Z])/g,"$1 $2").replaceAll("_"," ");
const groups: Record<string,string[]> = {
  "All tasks": [], "Arabic language": ["arabic","slang","localDialects","literature"],
  "Saudi context": ["saudi","gulf","culture","history"],
  "Knowledge & retrieval": ["rag","document","truthfulness","general"],
  "Agents & reasoning": ["agentic","agentic_tool_use","reasoning","puzzles","coding"],
  "Safety & alignment": ["safety","alignment"],
};
export function ModelProfile({study,model}:{study:PublicEvaluation;model:string}) {
 const catalog=useCatalog();
 const modelNames=Object.fromEntries(catalog.map(m=>[m.id,m.displayName]));
 const names=modelNames;
 const modelColor=(id:string)=>catalog.find(m=>m.id===id)?.color??"#237757";

 const [group,setGroup]=useState("All tasks");
 const [compare,setCompare]=useState(true);
 const [search,setSearch]=useState("");
 const [order,setOrder]=useState("name");

 const {prompt,level}=useComparison();
 const selected=study.configurationTracks.filter(t=>t.config===study.configurations.find(c=>c.model===t.model&&c.execution===prompt&&c.thinking===level)?.name);
 const other=catalog.find(m=>m.id!==model)?.id??"";
 const tasks=selected.filter(t=>t.model===model && (!groups[group].length || groups[group].includes(t.name)) && label(t.name).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>order==="score"?rate(b.acceptable,b.total)-rate(a.acceptable,a.total):order==="lowest"?rate(a.acceptable,a.total)-rate(b.acceptable,b.total):a.name.localeCompare(b.name));

 return <>
 <ReleaseExplorer execution="raw" study={study} onlyModel={model}/>
 <nav className="profile-jumps" aria-label="Model sections"><a href="#summary">Summary</a><a href="#benchmarks">Capabilities & benchmarks</a><a href="#configurations">Configurations</a><a href="#operations">Cost & speed</a><a href="#evidence">Result details</a></nav>
 <section id="summary" className="profile-section"><h2>What these results tell you</h2><p className="lede">The comparison and task breakdown use direct model execution and the same thinking level. Expand the comparison to explore additional levels.</p><div className="notice">Historical pre-audit evidence · Selected setting: {prompt === "raw" ? "Direct" : "Pi agent"} · {level} thinking. They do not establish production suitability, domain certification, or performance on the exact current dataset.</div></section>
 <section id="benchmarks" className="profile-section"><div className="explorer-heading"><div><h2>Capabilities & benchmarks</h2><p>Choose a problem area. Task scores use {prompt === "raw" ? "Direct" : "Pi agent"} · {level} thinking.</p></div><label className="compare-toggle"><input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)}/> Compare {names[other]}</label></div><div className="capability-tabs">{Object.keys(groups).map(g=><button key={g} aria-pressed={group===g} onClick={()=>setGroup(g)}>{g}</button>)}</div><div className="category-purpose" aria-live="polite"><strong>Why {group === "All tasks" ? "the full picture" : group.toLowerCase()} matters</strong><p>{capabilityPurpose[group]}</p></div><div className="result-controls"><label className="search-box"><input aria-label="Search benchmarks" placeholder="Find a benchmark…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Sort benchmarks" value={order} onChange={e=>setOrder(e.target.value)}><option value="name">Task name</option><option value="score">Highest score</option><option value="lowest">Lowest score</option></select></div><p className="table-footnote">Problem areas are navigation groups, not new composite indexes. Bars use a fixed 0–100% scale. Repeated configurations do not add independent cases.</p><div className="benchmark-bars">{tasks.map(t=>{const rival=selected.find(r=>r.name===t.name&&r.model===other);return <div className="benchmark-bar-row" key={t.name}><div className="benchmark-label"><strong>{label(t.name)}</strong><details className="task-context"><summary>Why it matters</summary><p>{taskPurpose[t.name] ?? "Inspect the task definition and scoring rubric to judge its relevance to your workload."}</p></details><small>{t.total.toLocaleString()} outputs in this setting</small></div><div>{[t,...compare&&rival?[rival]:[]].map(r=><div className="comparison-bar" key={r.model}><span>{names[r.model]}</span><div className="comparison-track"><i className={r.model} style={{background:modelColor(r.model),width:`${rate(r.acceptable,r.total)}%`}}/></div><strong>{rate(r.acceptable,r.total).toFixed(2)}%</strong></div>)}</div></div>;})}{!tasks.length&&<div className="empty">No benchmarks match. <button onClick={()=>{setSearch("");setGroup("All tasks");}}>Clear filters</button></div>}</div></section>
 <section id="configurations" className="profile-section"><h2>Prompt & reasoning configurations</h2><p className="lede">Every configuration covers {study.caseCount.toLocaleString()} case IDs. These are direct model calls. Keep the thinking setting fixed when comparing models.</p><div className="table-scroll"><table className="results-table"><thead><tr><th>Prompt</th><th>Reasoning</th><th>Acceptable rate</th><th>Technical failures</th></tr></thead><tbody>{study.configurations.filter(c=>c.model===model&&c.execution==="raw").map(c=><tr key={c.name}><td>{c.execution}</td><td>{c.thinking}</td><td>{rate(c.acceptable,c.total).toFixed(2)}%</td><td>{c.technical}</td></tr>)}</tbody></table></div></section>
 <section id="operations" className="profile-section"><h2>Cost & inference performance</h2><p className="lede">Controlled cost and speed comparisons require endpoint-specific measurements under a declared workload. Partial elapsed-time records are available in the Inference page; they are not a standardized inference benchmark.</p><div className="profile-metrics">{["Cost per acceptable task","Time to first token","Controlled end-to-end latency","Arabic output throughput"].map(m=><div className="panel" key={m}><span>{m}</span><strong className="unmeasured">Not measured</strong><small>Awaiting an instrumented evaluation</small></div>)}</div></section>
 <section id="evidence" className="profile-section"><h2>Result details & reproducibility</h2><details className="result-provenance"><summary>Dataset scope, scoring, and known limitations</summary><p>Acceptable = correct + possible correct, divided by all outputs. Technical failures contribute zero. All {study.caseCount.toLocaleString()} cases are included, including quarantined cases.</p><p>{study.disclosure}</p><p>{study.promptMismatchCount.toLocaleString()} prompts and {study.expectedMismatchCount.toLocaleString()} expected answers differ from the published dataset. No uncertainty interval has been computed; small score differences do not establish a statistically significant advantage.</p><a href={`https://huggingface.co/datasets/najdresearch/najd-benchmark/tree/${study.datasetRevision}`}>Pinned dataset reference ↗</a></details><Link href="/methodology">Read Najd evaluation methodology →</Link></section>
 </>;
}
