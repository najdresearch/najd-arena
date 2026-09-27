import {createHash} from "node:crypto";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {canonicalize} from "json-canonicalize";
import schema from "./result-bundle.schema.json";

const ajv = new Ajv({allErrors: true, strict: false});
addFormats(ajv);
const validateSchema = ajv.compile(schema);
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const digest = (value: unknown) => hash(canonicalize(value));

export type ResultBundle = {
  schema_version: string;
  kind: string;
  dataset_manifest: {id: string; version: string; split: string; case_ids: string[]; cases: {sha256: string; count: number}};
  task_pack: {id: string; version: string; labels: string[]; dataset: {id: string; version: string; cases_sha256: string}; uncertainty: {limitations: string}};
  run: {id: string; origin: string; visibility: string; model_requested: string; models_returned: string[]; benchmark_revision: string};
  records: Array<{case_id: string; status: string; output: string; expected_label: string; predicted_label: string | null; response_sha256: string; error_class: string | null}>;
  metrics: {case_count: number; correct: number; accuracy: number; grading_coverage: number; macro_f1: number; invalid_outputs: number; provider_errors: number; accuracy_ci95: {low: number; high: number}; latency_ms: {p50: number; p95: number}; tokens: {cases_with_missing_usage: number}; cost_usd: null; per_label: Array<{label: string; support: number; precision: number; recall: number; f1: number}>};
  dataset_manifest_sha256: string;
  task_pack_sha256: string;
  bundle_sha256: string;
};

export function validateResultBundle(value: unknown): ResultBundle {
  if (!validateSchema(value)) throw new Error("Result bundle does not match contract v1.");
  const bundle = value as ResultBundle;
  const {bundle_sha256: claimed, ...unsigned} = bundle;
  if (digest(unsigned) !== claimed || digest(bundle.dataset_manifest) !== bundle.dataset_manifest_sha256 || digest(bundle.task_pack) !== bundle.task_pack_sha256)
    throw new Error("Bundle content hashes do not match.");
  const manifest = bundle.dataset_manifest;
  const ids = bundle.records.map(r => r.case_id);
  if (new Set(ids).size !== ids.length || JSON.stringify(ids) !== JSON.stringify(manifest.case_ids) || ids.length !== manifest.cases.count || ids.length !== bundle.metrics.case_count)
    throw new Error("Case accounting differs from the dataset manifest.");
  const reference = bundle.task_pack.dataset;
  if (reference.id !== manifest.id || reference.version !== manifest.version || reference.cases_sha256 !== manifest.cases.sha256)
    throw new Error("Task pack references a different dataset.");
  for (const record of bundle.records) {
    if (hash(record.output) !== record.response_sha256) throw new Error("Response hash differs.");
    if (!bundle.task_pack.labels.includes(record.expected_label) || (record.status === "ok" ? !bundle.task_pack.labels.includes(record.predicted_label ?? "") : record.predicted_label !== null))
      throw new Error("Invalid label or outcome state.");
  }
  return bundle;
}

// Uploaded claims never prove server-managed execution. No preview can be promoted.
export function previewPublicationEligible(): false { return false; }
