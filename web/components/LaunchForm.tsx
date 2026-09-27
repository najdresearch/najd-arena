"use client";

import { useState } from "react";

type Organization = { id: string; name: string; approved: boolean; role: string };

export function LaunchForm({ organizations }: { organizations: Organization[] }) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const eligible = organizations.filter(org => org.approved && org.role !== "viewer");
  async function submit(formData: FormData) {
    if (pending) return;
    setPending(true);
    setStatus("Validating endpoint…");
    try {
    const body = {
      organizationId: formData.get("organizationId"), endpointUrl: formData.get("endpointUrl"),
      token: formData.get("token"), modelId: formData.get("modelId"),
      displayName: formData.get("displayName"), concurrency: Number(formData.get("concurrency")),
      rpm: Number(formData.get("rpm")), tpm: Number(formData.get("tpm")),
    };
    const response = await fetch("/api/runs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    setStatus(response.ok ? `Queued run ${payload.runId}` : typeof payload.error === "string" ? payload.error : "Check your endpoint and submission fields.");
    if (response.ok) window.location.reload();
    } catch { setStatus("Unable to submit. Check your connection and try again."); }
    finally { setPending(false); }
  }
  if (!eligible.length) return <div className="notice"><strong>Organization access needed</strong><p>{organizations.length ? "Your linked organizations appear below. An approved organization and runner role are required before submitting an endpoint." : "No organization membership was found. Join your organization on GitHub or Hugging Face, then sign out and sign in again to refresh access."}</p>{organizations.map(org => <p key={org.id}>{org.name} · {org.approved ? "Approved" : "Awaiting Najd approval"} · {org.role}</p>)}</div>;
  return <form action={submit} className="form-grid">
    <div className="field full"><label htmlFor="organizationId">Organization</label><select id="organizationId" name="organizationId">{eligible.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div>
    <div className="field full"><label htmlFor="endpointUrl">OpenAI-compatible endpoint</label><input id="endpointUrl" name="endpointUrl" type="url" required placeholder="https://inference.example.com/v1" /></div>
    <div className="field"><label htmlFor="displayName">Public model name</label><input id="displayName" name="displayName" required placeholder="Model 70B Instruct" /></div>
    <div className="field"><label htmlFor="modelId">API model ID</label><input id="modelId" name="modelId" required placeholder="organization/model-70b" /></div>
    <div className="field full"><label htmlFor="token">Bearer token</label><input id="token" name="token" type="password" required autoComplete="off" placeholder="Encrypted until inference completes" /></div>
    <div className="field"><label htmlFor="concurrency">Concurrency</label><input id="concurrency" name="concurrency" type="number" min="1" max="64" defaultValue="8" /></div>
    <div className="field"><label htmlFor="rpm">Requests / minute</label><input id="rpm" name="rpm" type="number" min="1" defaultValue="60" /></div>
    <div className="field"><label htmlFor="tpm">Tokens / minute</label><input id="tpm" name="tpm" type="number" min="1" defaultValue="100000" /></div>
    <div className="field"><button className="button" type="submit" disabled={pending}>{pending ? "Submitting…" : "Start 6,089-case run"}</button></div>
    {status && <div className="notice field full" role="status">{status}</div>}
  </form>;
}
