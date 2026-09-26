"use client";
import {useCatalog} from "./CatalogProvider";
import { useComparison } from "./useComparison";
import { ProviderLogo } from "./ProviderLogo";
import { useState } from "react";
import type { PublicEvaluation } from "@/lib/db";
import {  rate, effortLevels } from "@/lib/model-catalog";
const tasks:Record<string,{track:string;why:string;gap:string}>={
 "Arabic customer support":{track:"arabic",why:"Arabic task scores offer an initial language signal for customer conversations.",gap:"No dedicated customer-support resolution or dialect-specific service evaluation is available."},
 "Saudi knowledge questions":{track:"saudi",why:"Saudi-focused questions provide a starting point for local knowledge needs.",gap:"Current-service accuracy and regulated-domain suitability are not established."},
 "Document / RAG assistants":{track:"rag",why:"Retrieval task scores indicate how models answer evidence-based questions in this evaluation.",gap:"Your documents, retrieval stack, citation requirements, and access controls need their own testing."},
 "Tool-using agents":{track:"agentic_tool_use",why:"Tool-use tasks provide evidence relevant to action selection.",gap:"This does not establish end-to-end reliability in your production tool environment."},
};
export function Recommender({study}:{study:PublicEvaluation}){
 const catalog=useCatalog();
 const modelNames=Object.fromEntries(catalog.map(m=>[m.id,m.displayName]));
 const modelSlug=(id:string)=>catalog.find(m=>m.id===id)?.slug??id;
const [task,setTask]=useState(Object.keys(tasks)[0]);const {prompt,setPrompt,level,setLevel}=useComparison();const t=tasks[task];const rows=study.configurationTracks.filter(r=>r.name===t.track&&r.config===study.configurations.find(c=>c.model===r.model&&c.execution===prompt&&c.thinking===level)?.name).sort((a,b)=>rate(b.acceptable,b.total)-rate(a.acceptable,a.total));return <><div className="capability-tabs">{Object.keys(tasks).map(k=><button key={k} aria-pressed={task===k} onClick={()=>setTask(k)}>{k}</button>)}</div><div className="result-controls"><label className="metric-select">Execution<select aria-label="Recommendation prompt" value={prompt} onChange={e=>setPrompt(e.target.value)}><option value="raw">Direct</option><option value="pi">Pi agent</option></select></label><label className="metric-select">Thinking<select aria-label="Recommendation thinking level" value={level} onChange={e=>setLevel(e.target.value)}>{effortLevels.map(l=><option key={l}>{l}</option>)}</select></label></div><div className="category-purpose"><strong>Why this evidence is relevant</strong><p>{t.why}</p><p>{t.gap}</p></div><div aria-live="polite">{rows.map((r,i)=><a className="recommendation-row" href={`/models/${modelSlug(r.model)}?execution=${prompt}&thinking=${level}`} key={r.model}><div><span className="eyebrow">{i===0?"Highest observed task score":"Alternative to compare"}</span><h2><ProviderLogo model={r.model}/> {modelNames[r.model]}</h2><p>{r.total} outputs · {t.track} · {prompt} · {level}</p></div><strong>{rate(r.acceptable,r.total).toFixed(2)}%</strong></a>)}</div><p className="table-footnote">Evidence shortlist from available models, not a production recommendation. Historical pre-audit data; no cost, speed, or significance-based recommendation is available.</p></>}
