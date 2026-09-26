import { publicEvaluation } from "@/lib/db";
import { ReleaseCatalog } from "@/components/ReleaseCatalog";
export const dynamic="force-dynamic";
export const metadata={title:"Model releases"};
export default async function Releases(){const study=await publicEvaluation();return <main className="shell category-page"><div className="eyebrow">Release catalog</div><h1>Models & thinking levels</h1><p className="lede">Explore model configurations from direct model calls across recorded thinking levels. Provider release dates and specifications are listed when verified.</p>{study?<ReleaseCatalog study={study}/>:<div className="empty">Results are temporarily unavailable.</div>}</main>}
