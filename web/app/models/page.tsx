import Link from "next/link";
import { publicEvaluation } from "@/lib/db";
import { ReleaseExplorer } from "@/components/ReleaseExplorer";
export const dynamic="force-dynamic";
export const metadata={title:"Model comparisons"};
export default async function Models(){const study=await publicEvaluation();return <main className="shell category-page"><div className="eyebrow">Model comparisons</div><h1>Compare models</h1><p className="lede">Compare Arabic, Saudi, retrieval, and tool-use results from direct model calls. Compare thinking levels without an agent harness.</p><div className="profile-jumps"><Link href={{pathname:"/models/releases"}}>Browse releases →</Link><Link href={{pathname:"/recommender"}}>Find a model for your task →</Link></div>{study?<ReleaseExplorer execution="raw" study={study}/>:<div className="empty">Results are temporarily unavailable.</div>}<div className="category-purpose"><strong>Operational metrics</strong><p>Partial execution-time samples are available under Inference. Controlled speed, token throughput, and cost are not established and are not used to rank these models.</p></div></main>}
