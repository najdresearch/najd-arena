"use client";

import { useEffect, useState } from "react";
import type { PrivateRun } from "@/lib/types";

export function RunProgress({ initial }: { initial: PrivateRun }) {
  const [run, setRun] = useState(initial);
  const [message, setMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => {
    if (["published", "rejected", "cancelled", "failed", "awaiting_review"].includes(run.status)) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/runs/${run.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const value = await response.json();
      setRun(current => ({ ...current, status: value.status, completedCases: value.completed_cases,
        totalCases: value.total_cases, errors: value.error_count, score: Number(value.najd_score ?? 0) }));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [run.id, run.status]);
  const progress = run.totalCases ? run.completedCases / run.totalCases * 100 : 0;
  async function cancel() {
    setCancelling(true);
    setMessage("");
    try {
      const response = await fetch(`/api/runs/${run.id}/cancel`, { method: "POST" });
      if (!response.ok) { setMessage("Cancellation was not accepted. Refresh to check the current run status."); return; }
      setRun(current => ({ ...current, status: "cancelled" }));
    } catch { setMessage("Could not reach the server. The run may still be active."); }
    finally { setCancelling(false); }
  }
  async function requestPublication(){
    const response=await fetch(`/api/runs/${run.id}/publication`,{method:"POST"});
    if(response.ok){setRun(current=>({...current,publicationRequested:true}));setMessage("Organization approval recorded. This evaluation remains private until a Najd Arena administrator approves it.");}
    else setMessage("Publication request was not accepted. Your result remains private.");
  }
  return <div className="run-row"><div><strong>{run.modelName}</strong>
    <div className="meta">{run.status} · {run.completedCases.toLocaleString()} / {run.totalCases.toLocaleString()} cases · {run.errors} errors</div>
    <div className="progress-track" aria-label={`${progress.toFixed(0)}% complete`}><div className="progress-fill" style={{width: `${progress}%`}} /></div>
    {! ["published", "rejected", "cancelled", "failed", "awaiting_review"].includes(run.status) &&
      <button className="chip" type="button" onClick={cancel} disabled={cancelling} style={{marginTop: ".75rem"}}>{cancelling ? "Cancelling…" : "Cancel"}</button>}
  {run.status==="awaiting_review"&&run.canRequestPublication&&!run.publicationRequested&&<button className="chip" onClick={requestPublication}>Approve public publication</button>}
  {run.publicationRequested&&run.status!=="published"&&<p className="meta">Organization approved · Awaiting Najd Arena approval</p>}
  {message && <p role="status" className="notice">{message}</p>}</div><div className="score">{run.score ? (run.score * 100).toFixed(1) : "—"}</div></div>;
}
