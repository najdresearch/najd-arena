import Link from "next/link";
import { publicEvaluation } from "@/lib/db";
import { ReleaseExplorer } from "@/components/ReleaseExplorer";
import { AnalysisOverview } from "@/components/AnalysisOverview";
import { UiIcon } from "@/components/UiIcon";
export const dynamic="force-dynamic";
export default async function Home(){
 const study=await publicEvaluation();
 return <main className="shell analysis-home">
 <section className="analysis-hero"><div><div className="eyebrow">Independent evaluation by Najd Research</div><h1>The benchmark for<br/><em>Arabic and Saudi AI.</em></h1><p>Understand model performance where language,<br className="desktop-break"/> local knowledge, and real-world tasks meet.</p></div><aside className="hero-editorial"><Link href={{pathname:'/models'}}><span className="editorial-kicker">Explore the results</span><strong>Explore evaluated models</strong><p>Compare language, knowledge, and tool decisions across execution settings.</p><UiIcon name="arrow"/></Link><Link href="/methodology"><span className="editorial-kicker">Our approach</span><strong>Context matters. Evidence comes first.</strong><p>See what Najd measures and how to interpret each score.</p><UiIcon name="arrow"/></Link></aside></section>
 {study?<><AnalysisOverview study={study}/><section id="thinking" className="analysis-section"><div className="section-heading"><div><h2>Explore thinking levels</h2><p>Compare every recorded setting. Direct and Pi execution remain separate.</p></div><Link href={{pathname:'/models/releases'}}>All configurations <UiIcon name="arrow"/></Link></div><ReleaseExplorer study={study}/></section></>:<div className="empty">Measured results are temporarily unavailable.</div>}
 <section className="analysis-close"><div><span className="eyebrow">Built for the questions that matter here</span><h2>Bring your model.<br/>Measure it in context.</h2></div><Link href="/request-evaluation" className="button">Request an evaluation <UiIcon name="arrow"/></Link></section>
 </main>;
}
