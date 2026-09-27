import {requireAdmin} from "@/lib/admin";
import {validateResultBundle} from "@/lib/contracts/validate";

export async function POST(request: Request) {
  if (!await requireAdmin()) return Response.json({error: "Administrator access required."}, {status: 403});
  const reader = request.body?.getReader();
  if (!reader) return Response.json({error: "A JSON bundle is required."}, {status: 400});
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2_000_000) { await reader.cancel(); return Response.json({error: "Maximum bundle size is 2 MB."}, {status: 413}); }
    chunks.push(value);
  }
  try {
    const bundle = validateResultBundle(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    return Response.json({bundle, publicationEligible: false}, {headers: {"Cache-Control": "no-store"}});
  } catch {
    return Response.json({error: "Invalid bundle: check schema, hashes, labels and case accounting."}, {status: 400});
  }
}
