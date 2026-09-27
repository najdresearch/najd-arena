import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {canonicalize} from "json-canonicalize";
import fixture from "./fixtures/result-bundle.fixture.json";
import {validateResultBundle,previewPublicationEligible} from "./validate";

function reseal(bundle: typeof fixture) {
  const {bundle_sha256: _digest,...unsigned}=bundle; void _digest;
  bundle.bundle_sha256=createHash("sha256").update(canonicalize(unsigned)).digest("hex");
  return bundle;
}
describe("shared result contract",()=>{
  it("accepts the Python-produced canonical bundle",()=>{
    expect(validateResultBundle(fixture).metrics.case_count).toBe(8);
  });
  it("rejects changed bytes, unknown versions and duplicate IDs",()=>{
    const changed=structuredClone(fixture);changed.records[0].output="changed";
    expect(()=>validateResultBundle(changed)).toThrow();
    const version=structuredClone(fixture);version.schema_version="2.0.0";
    expect(()=>validateResultBundle(version)).toThrow();
    const duplicate=structuredClone(fixture);duplicate.records[1].case_id=duplicate.records[0].case_id;
    expect(()=>validateResultBundle(reseal(duplicate))).toThrow(/accounting/);
  });
  it("never establishes publication eligibility from a claimed origin",()=>{
    const spoofed=structuredClone(fixture);spoofed.run.origin="arena_managed";
    validateResultBundle(reseal(spoofed));
    expect(previewPublicationEligible()).toBe(false);
  });
});
