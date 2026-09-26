import Link from "next/link";
import { publicEvaluation } from "@/lib/db";
import { ModelCatalog } from "@/components/ModelCatalog";
export const dynamic="force-dynamic";
export const metadata={title:"Model catalog"};
export default async function Models(){const study=await publicEvaluation();return <main className="shell category-page"><div className="eyebrow">Model catalog</div><h1>Explore models</h1><p className="lede">Browse models evaluated on Arabic and Saudi tasks. Inspect a model’s results and specifications, or use Leaderboards to compare task rankings.</p><div className="profile-jumps"><Link href={{pathname:"/models/releases"}}>Browse configurations →</Link><Link href={{pathname:"/recommender"}}>Find a model for your task →</Link></div>{study?<ModelCatalog study={study}/>:<div className="empty">Results are temporarily unavailable.</div>}<div className="category-purpose"><strong>Operational metrics</strong><p>Partial execution-time samples are available under Inference. Controlled speed, token throughput, and cost are not established and are not used to rank these models.</p></div></main>}
