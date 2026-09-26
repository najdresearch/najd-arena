import Link from "next/link";
import {EvaluationRequest} from "@/components/EvaluationRequest";
import "./request-evaluation.css";

export const metadata = {
  title:"Request an evaluation",
  description:"Plan an Arabic and Saudi AI evaluation with Najd Research. Understand task-level performance, failure patterns, and what to improve next.",
};

export default function RequestEvaluation() {
  return <main className="shell evaluation-page">
    <section className="evaluation-hero"><div className="eyebrow">Evaluation by Najd Research</div><h1>Know where your model works.<br/><em>Know what to improve.</em></h1><p>Evaluate your model or AI application on Arabic, Saudi knowledge, and the tasks your users depend on. Start with a focused question; agree on the evidence needed to answer it.</p><div className="evaluation-hero-actions"><a className="evaluation-primary" href="#request">Plan your evaluation →</a><Link href="/models">Explore published results ↗</Link></div><div className="evaluation-trust"><span>Private by default</span><span>Scope agreed before a run</span><span>Publication requires your approval</span></div></section>
    <div className="evaluation-layout"><div className="evaluation-overview"><section><div className="eyebrow">Beyond a headline score</div><h2>Build an evaluation around your decision.</h2><p>Whether you’re comparing versions or investigating a weak area, we’ll discuss the tasks, measurements, and reporting your team needs.</p><div className="evaluation-deliverables">{[
      ["01","Performance by task","Identify where results differ across Arabic language, local knowledge, retrieval, or tool decisions."],
      ["02","Failure analysis","Agree on an analysis of answer quality and failure patterns so your team can prioritize improvements."],
      ["03","A repeatable comparison","Define the dataset version, scoring, and execution settings for a meaningful comparison with future runs."],
    ].map(([n,t,d])=><article key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></article>)}</div></section>
    <section className="evaluation-coverage"><h3>What can we discuss today?</h3><p>Start with Arabic and Saudi text tasks, document/RAG assistants, or tool decisions. Custom scopes and agent workflows are agreed individually.</p><p><strong>Vision, Arabic OCR, and speech are in development.</strong> You can register interest; availability is confirmed during scoping.</p><Link href="/methodology">Read our measurement approach →</Link></section></div><EvaluationRequest/></div>
    <section className="evaluation-process"><div className="eyebrow">From question to evidence</div><h2>A clear path, with you in control.</h2><div>{[
      ["1","Agree on the scope","We discuss your use case, task coverage, success criteria, pricing, and timeline before work begins."],
      ["2","Evaluate privately","Arrange access securely, confirm execution settings, and review the results and limitations with your team."],
      ["3","Decide on publication","Results remain private unless your organization and at least one Najd Arena admin approve publication. Public results carry a publication date."],
    ].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>
    <section className="evaluation-faq"><h2>Before you request</h2><details><summary>Do I need an OpenAI-compatible endpoint?</summary><p>An OpenAI-compatible endpoint is the intended integration path. For this first conversation, share only a model or application description. We’ll agree on access requirements before evaluation.</p></details><details><summary>Will my results appear on the leaderboard?</summary><p>Not automatically. Publication needs your organization’s approval and approval from at least one Najd Arena administrator. A private evaluation does not commit you to public results.</p></details><details><summary>How much does an evaluation cost?</summary><p>Pricing and timing depend on task coverage, model usage, and analysis depth. These are agreed during scoping. Sending a request does not start a paid run.</p></details><details><summary>Can I submit an endpoint and run it myself?</summary><p>Self-service endpoint submissions are not open yet. Start with the request above. If you already have access, visit your <Link href="/dashboard">organization workspace</Link>.</p></details></section>
  </main>;
}
