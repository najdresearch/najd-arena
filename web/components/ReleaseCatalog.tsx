"use client";
import {PublicationDate} from "./PublicationDate";
import {useCatalog} from "./CatalogProvider";
import {useState} from "react";
import Link from "next/link";
import type {PublicEvaluation} from "@/lib/db";
import {rate} from "@/lib/model-catalog";
import {ProviderLogo} from "./ProviderLogo";
export function ReleaseCatalog({study}:{study:PublicEvaluation}){
 const catalog=useCatalog();
 const modelNames=Object.fromEntries(catalog.map(m=>[m.id,m.displayName]));
 const modelSlug=(id:string)=>catalog.find(m=>m.id===id)?.slug??id;

 const [search,setSearch]=useState("");
 const rows=study.configurations.filter(r=>r.execution==="raw").filter(r=>`${modelNames[r.model]} ${r.name}`.toLowerCase().includes(search.toLowerCase()));
 return <><label className="catalog-search">Search configurations<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Model, execution path, or thinking level…"/></label><div className="table-scroll" tabIndex={0} role="region" aria-label="Results table, scroll horizontally for more columns"><table className="results-table"><thead><tr><th>Model</th><th>Execution</th><th>Thinking</th><th>Acceptable rate</th><th>Published</th></tr></thead><tbody>{rows.map(r=>{const {execution,thinking}=r;return <tr key={r.name}><td><Link className="provider-table-label" href={{pathname:`/models/${modelSlug(r.model)}`,query:{execution,thinking}}}><ProviderLogo model={r.model}/>{modelNames[r.model]}</Link></td><td>{execution==="raw"?"Direct":"Pi agent"}</td><td>{thinking}</td><td>{rate(r.acceptable,r.total).toFixed(2)}%</td><td><PublicationDate value={r.publishedAt}/></td></tr>;})}</tbody></table></div>{!rows.length&&<div className="empty">No matching configurations. <button onClick={()=>setSearch("")}>Clear search</button></div>}<p className="table-footnote">Historical results. Each row represents a distinct configuration; scores are not pooled.</p></>;
}
