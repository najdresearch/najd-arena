import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {expect,it} from "vitest";
import {BundleSummary} from "../../components/ContractPreview";
import {validateResultBundle} from "./validate";
import fixture from "./fixtures/result-bundle.fixture.json";
it("renders denominator, failures and private development status",()=>{
  const html=renderToStaticMarkup(<BundleSummary bundle={validateResultBundle(fixture)}/>);
  expect(html).toContain("Not publishable");
  expect(html).toContain("provider errors");
  expect(html).toContain("Correct routing");
  expect(html).toContain("Cost unavailable");
});
