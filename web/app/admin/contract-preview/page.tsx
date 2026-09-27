import {notFound} from "next/navigation";
import {requireAdmin} from "@/lib/admin";
import {ContractPreview} from "@/components/ContractPreview";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!await requireAdmin()) notFound();
  return <main className="shell category-page"><div className="eyebrow">Admin tools</div><h1>Private contract preview</h1><p className="lede">Inspect a development result bundle before integrating a task pack.</p><ContractPreview/></main>;
}
