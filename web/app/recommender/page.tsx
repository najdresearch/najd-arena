import { Recommender } from "@/components/Recommender";
import { publicEvaluation } from "@/lib/db";
export const dynamic="force-dynamic";
export const metadata={title:"Model recommender"};
export default async function Page(){const study=await publicEvaluation();return <main className="shell category-page"><div className="eyebrow">Model recommender</div><h1>What are you building?</h1><p className="lede">Start with a user problem. Get a shortlist tied to measured tasks and inspect what remains untested.</p>{study?<Recommender study={study}/>:<div className="empty">Results are temporarily unavailable.</div>}</main>}
