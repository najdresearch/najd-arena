import { categoryPurpose, plannedTrackPurpose } from "@/lib/category-context";
import {publicEvaluation} from "@/lib/db";
import { ExecutionTiming } from "@/components/ExecutionTiming";
import Link from "next/link";
import { notFound } from "next/navigation";
const enterprisePurpose:Record<string,string>={
 "Visual understanding":"Interpret screenshots, diagrams, and business imagery in context.",
 "Arabic OCR":"Read Arabic and mixed Arabic–English text from scans and photographs.",
 "Document extraction":"Extract fields and line items from invoices, forms, and receipts.",
 "Charts & tables":"Recover structured values and answer questions about tables and charts.",
 "Document layout":"Recognize reading order, headings, and sections in complex business documents."
};
const sections: Record<string, {title:string; description:string; tracks:string[]}> = {
  "coding-agents": {title:"Coding Agents", description:"Compare agents on coding and software engineering tasks.", tracks:["Repository tasks", "Tool decisions", "Task completion"]},
  image: {title:"Image", description:"Evaluate visual understanding and Arabic documents for enterprise workflows.", tracks:["Visual understanding", "Arabic OCR", "Document extraction", "Charts & tables", "Document layout"]},
  speech: {title:"Speech", description:"Compare speech models in Arabic, including regional dialects.", tracks:["Speech to text", "Text to speech"]},
  inference: {title:"Inference", description:"Compare model-serving performance using measured endpoint results.", tracks:["Output speed", "Time to first token", "Cost per task"]},
};
export default async function Category({params}: {params:Promise<{section:string}>}) {
  const {section} = await params;
  const study=section==="inference"?await publicEvaluation():null;
  if (section === "about") return <main className="shell category-page"><div className="eyebrow">About Najd Arena</div><h1>AI evaluation,<br/>in context.</h1><p className="lede">Najd Arena compares AI performance on Arabic and Saudi tasks. Explore model results, inspect how scores are calculated, or connect your organization’s endpoint for evaluation.</p><section className="category-purpose"><h2>Why it matters</h2><p>{categoryPurpose.about}</p></section><div className="category-cards"><Link href="/methodology" className="panel"><h2>Methodology ↗</h2><p>Understand evaluation and scoring.</p></Link><a href="https://huggingface.co/datasets/najdresearch/najd-benchmark" className="panel"><h2>Dataset ↗</h2><p>Access the published dataset.</p></a><Link href="/dashboard" className="panel"><h2>Submit a model ↗</h2><p>Sign in and connect an endpoint.</p></Link></div></main>;
  const item = sections[section]; if (!item) notFound();
  return <main className="shell category-page"><div className="eyebrow">Najd Arena / {item.title}</div><h1>{item.title}</h1><p className="lede">{item.description}</p><section className="category-purpose"><h2>Why it matters</h2><p>{categoryPurpose[section]}</p></section><div className="planned-tracks">{item.tracks.map(t => <div className="panel" key={t}><h2>{t}</h2><p className="task-purpose">{enterprisePurpose[t] ?? plannedTrackPurpose[t]}</p><span className="availability">Planned evaluation</span></div>)}</div>{section === "inference" && study && <ExecutionTiming study={study}/>}<div className="empty"><h2>{section === "inference" ? "Controlled inference evaluations are coming" : "Evaluations are in development"}</h2><p>{section === "ai-trends" ? "Trends will appear when comparable results across multiple dates are available." : "Rankings will appear when validated evaluations are available. Contribute an endpoint or discuss a benchmark with Najd."}</p><Link href={{pathname:"/models"}}>Explore text model results →</Link> · <a href="mailto:salam@najdresearch.com">Get in touch</a></div></main>;
}
