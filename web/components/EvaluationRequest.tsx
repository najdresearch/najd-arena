"use client";

import {useState, type FormEvent} from "react";

export function EvaluationRequest() {
  const [preview,setPreview]=useState("");
  const [status,setStatus]=useState("");
  function prepare(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    setPreview(`Hello Najd Research,\n\nI'd like to discuss an evaluation.\n\nOrganization: ${data.get("organization")}\nModel or application: ${data.get("model")}\nEvaluation focus: ${data.get("focus")}\nGoal: ${data.get("goal")}\nTimeline: ${data.get("timeline") || "Flexible"}\n\nPlease share the next steps for agreeing on scope, access, and pricing.`);
    setStatus("");
  }
  async function copy() {
    try {await navigator.clipboard.writeText(preview);setStatus("Request copied. Paste it into an email to salam@najdresearch.com.");}
    catch {setStatus("Copy is unavailable. Select and copy the request below.");}
  }
  return <section className="evaluation-form" id="request"><div className="eyebrow">Start here</div><h2>Tell us what you want to learn.</h2><p>A few details help us propose a useful evaluation. No endpoint or API key is needed at this stage.</p>
    <form onSubmit={prepare} onChange={()=>{setPreview("");setStatus("");}}>
      <div className="evaluation-fields"><label>Organization<input name="organization" autoComplete="organization" required maxLength={120} placeholder="Your organization"/></label><label>Model or application<input name="model" required maxLength={160} placeholder="Name or a short description"/></label></div>
      <label>Evaluation focus<select name="focus" defaultValue="Arabic and Saudi text tasks"><option>Arabic and Saudi text tasks</option><option>Document and RAG assistants</option><option>Tool decisions and agent workflows</option><option>Custom benchmark</option><option>Vision / OCR — discuss planned coverage</option><option>Speech — discuss planned coverage</option></select></label>
      <label>What decision should the evaluation help you make?<textarea name="goal" required maxLength={1200} rows={4} placeholder="For example: understand where our Arabic support assistant fails, or compare two model versions."/></label>
      <label>Timeline <span>(optional)</span><select name="timeline" defaultValue="Flexible"><option>Flexible</option><option>Within a month</option><option>Within three months</option><option>Exploring for later</option></select></label>
      <p className="evaluation-form-note">Keep this brief non-sensitive. Don’t include credentials, customer data, or private evaluation examples.</p>
      <button className="evaluation-primary" type="submit">Prepare email request <span aria-hidden="true">→</span></button>
      <p className="evaluation-form-note">This form prepares an email; it does not submit or save your request.</p>
    </form>
    {preview&&<div className="evaluation-preview" aria-live="polite"><h3>Your request is ready to review</h3><p>Open your email app and send it to Najd, or copy the text into your preferred email service.</p><textarea aria-label="Prepared evaluation request" readOnly value={preview} rows={10}/><div className="evaluation-actions"><a className="evaluation-primary" href={`mailto:salam@najdresearch.com?subject=${encodeURIComponent("Najd Arena evaluation request")}&body=${encodeURIComponent(preview)}`}>Open email draft ↗</a><button type="button" onClick={copy}>Copy request</button></div></div>}
    <p role="status">{status}</p><p className="evaluation-direct">Prefer to write directly? <a href="mailto:salam@najdresearch.com">salam@najdresearch.com ↗</a></p>
  </section>;
}
