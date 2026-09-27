"use client";
import {useState} from "react";
import type {ResultBundle} from "@/lib/contracts/validate";

export function BundleSummary({bundle}: {bundle: ResultBundle}) {
  const m = bundle.metrics;
  return <section aria-label="Private result preview">
    <div className="notice"><strong>Development preview · Private · Not publishable</strong><p>Schema, content hashes and case accounting validated. Uploaded metrics and model identity are self-reported. Only Arena-managed evaluations can enter publication review.</p></div>
    <h2>{bundle.run.model_requested}</h2><p>{bundle.task_pack.id} · {bundle.task_pack.version} · {bundle.dataset_manifest.split}</p>
    <div className="panel-grid"><article className="panel"><h3>Correct routing</h3><p className="lede">{m.correct} / {m.case_count} ({(m.accuracy*100).toFixed(1)}%)</p><p>95% Wilson interval: {(m.accuracy_ci95.low*100).toFixed(1)}–{(m.accuracy_ci95.high*100).toFixed(1)}%</p></article>
    <article className="panel"><h3>Execution coverage</h3><p>{(m.grading_coverage*100).toFixed(1)}% graded · {m.invalid_outputs} invalid outputs · {m.provider_errors} provider errors</p><p>Median / p95 latency: {m.latency_ms.p50.toFixed(0)} / {m.latency_ms.p95.toFixed(0)} ms</p><p>Cost unavailable · Missing usage for {m.tokens.cases_with_missing_usage} cases</p></article></div>
    <p>{bundle.task_pack.uncertainty.limitations}</p>
    <div style={{overflowX:"auto"}}><table><caption>Routing by label</caption><thead><tr><th>Label</th><th>Cases</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead><tbody>{m.per_label.map(r=><tr key={r.label}><td>{r.label}</td><td>{r.support}</td><td>{r.precision.toFixed(2)}</td><td>{r.recall.toFixed(2)}</td><td>{r.f1.toFixed(2)}</td></tr>)}</tbody></table></div>
    <h3>Case evidence</h3>{bundle.records.map(r=><details key={r.case_id}><summary>{r.case_id} · {r.status} · expected {r.expected_label}, predicted {r.predicted_label ?? "none"}</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{r.output || r.error_class || "No output"}</pre></details>)}
    <details><summary>Reproducibility</summary><p style={{overflowWrap:"anywhere"}}>Bundle SHA-256: {bundle.bundle_sha256}</p><p>Benchmark revision: {bundle.run.benchmark_revision}</p></details>
  </section>;
}

export function ContractPreview() {
  const [bundle,setBundle] = useState<ResultBundle|null>(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  return <><section className="panel"><label htmlFor="bundle">Choose a result bundle (JSON, maximum 2 MB)</label><input id="bundle" type="file" accept=".json,application/json" disabled={busy} onChange={async event=>{
    const file=event.target.files?.[0]; if (!file) return;
    setError("");setBundle(null);
    if (file.size>2_000_000) {setError("Maximum bundle size is 2 MB.");return;}
    setBusy(true);
    try {const response=await fetch("/api/admin/contract-preview",{method:"POST",headers:{"Content-Type":"application/json"},body:await file.text()}); const result=await response.json(); if(!response.ok) throw new Error(result.error);setBundle(result.bundle);}
    catch(error){setError(error instanceof Error?error.message:"Could not validate bundle.");}finally{setBusy(false);}
  }}/><p>Preview only. This does not store a run, enqueue work, or submit results for publication.</p>{busy&&<p role="status">Validating…</p>}{error&&<p role="alert">{error}</p>}</section>{bundle&&<BundleSummary bundle={bundle}/>}</>;
}
