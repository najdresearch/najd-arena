"use client";

import { useEffect, useState } from "react";
import type { PrivateRun } from "@/lib/types";

export function RunProgress({ initial }: { initial: PrivateRun }) {
  const [run, setRun] = useState(initial);
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
    await fetch(`/api/runs/${run.id}/cancel`, { method: "POST" });
    setRun(current => ({ ...current, status: "cancelled" }));
  }
  return <div className="run-row"><div><strong>{run.modelName}</strong>
    <div className="meta">{run.status} · {run.completedCases.toLocaleString()} / {run.totalCases.toLocaleString()} cases · {run.errors} errors</div>
    <div className="progress-track" aria-label={`${progress.toFixed(0)}% complete`}><div className="progress-fill" style={{width: `${progress}%`}} /></div>
    {! ["published", "rejected", "cancelled", "failed", "awaiting_review"].includes(run.status) &&
      <button className="chip" type="button" onClick={cancel} style={{marginTop: ".75rem"}}>Cancel</button>}
  </div><div className="score">{run.score ? (run.score * 100).toFixed(1) : "—"}</div></div>;
}
