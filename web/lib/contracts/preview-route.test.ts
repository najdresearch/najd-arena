import {beforeEach,expect,it,vi} from "vitest";
import {POST} from "../../app/api/admin/contract-preview/route";
import {requireAdmin} from "../admin";
import fixture from "./fixtures/result-bundle.fixture.json";
vi.mock("@/lib/admin",()=>({requireAdmin:vi.fn()}));
beforeEach(()=>vi.resetAllMocks());
it("denies signed-out and non-admin requests before reading a bundle",async()=>{
  vi.mocked(requireAdmin).mockResolvedValue(null);
  const response=await POST(new Request("https://example.org",{method:"POST",body:JSON.stringify(fixture)}));
  expect(response.status).toBe(403);
});
it("previews valid data privately with no publication eligibility",async()=>{
  vi.mocked(requireAdmin).mockResolvedValue({id:"test",email:"test@example.org"});
  const response=await POST(new Request("https://example.org",{method:"POST",body:JSON.stringify(fixture)}));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect((await response.json()).publicationEligible).toBe(false);
});
it("rejects oversized and invalid requests",async()=>{
  vi.mocked(requireAdmin).mockResolvedValue({id:"test",email:"test@example.org"});
  expect((await POST(new Request("https://example.org",{method:"POST",body:"x".repeat(2_000_001)}))).status).toBe(413);
  expect((await POST(new Request("https://example.org",{method:"POST",body:"{}"}))).status).toBe(400);
});
