"use client";
import {useState} from "react";
import Link from "next/link";
import type {PublicEvaluation} from "@/lib/db";
import {ProviderLogo} from "./ProviderLogo";
import {useComparison} from "./useComparison";
import {effortLevels,rate} from "@/lib/model-catalog";
export function ModelCatalog({study}:{study:PublicEvaluation}) {
 const [search,setSearch]=useState(""); const {level,setLevel}=useComparison();
 const models=study.catalog.filter(m=>`${m.displayName} ${m.providerName}`.toLowerCase().includes(search.toLowerCase()));
 return <><div className="catalog-controls"><label className="catalog-search">Find a model<input type="search" placeholder="Search model or provider" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Thinking setting<select aria-label="Catalog thinking setting" value={level} onChange={e=>setLevel(e.target.value)}>{effortLevels.map(l=><option key={l}>{l}</option>)}</select></label></div><div className="model-catalog-grid">{models.map(m=>{const config=study.configurations.find(c=>c.model===m.id&&c.execution==="raw"&&c.thinking===level);const task=(name:string)=>study.configurationTracks.find(t=>t.config===config?.name&&t.name===name);return <article className="model-catalog-card" key={m.id}><div className="catalog-identity"><ProviderLogo model={m.id} size={44}/><div><h2><Link href={{pathname:`/models/${m.slug}`,query:{thinking:level}}}>{m.displayName}</Link></h2><p>{m.providerName}</p></div></div><dl>{[["Overall",config],["Arabic",task("arabic")],["Saudi",task("saudi")]].map(([name,row])=>{const r=row as typeof config;return <div key={String(name)}><dt>{String(name)}</dt><dd>{r?`${rate(r.acceptable,r.total).toFixed(1)}%`:"—"}</dd></div>;})}</dl><p className="analysis-note">Direct model calls · {level} thinking<br/>Historical acceptable answer rate</p><Link className="catalog-details" href={{pathname:`/models/${m.slug}`,query:{thinking:level}}}>View performance and specifications →</Link></article>;})}</div>{!models.length&&<div className="empty">No matching models. <button onClick={()=>setSearch("")}>Clear search</button></div>}<p className="analysis-note">Historical evaluation dates and publication dates have not been verified. <Link href="/methodology">Read the evidence and scoring policy →</Link></p></>;
}
