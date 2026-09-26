import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const CHECKSUM = "4d3189a6b13407dd6d3dcf3ae7857f3178d78000190767666167460f6ad37038";

export async function seedHistorical(client) {
  const compressed = await readFile(new URL("./seeds/historical-m3.json.gz", import.meta.url));
  if (createHash("sha256").update(compressed).digest("hex") !== CHECKSUM) {
    throw new Error("Historical deployment seed checksum mismatch");
  }
  const { experiment, grades } = JSON.parse(gunzipSync(compressed));
  const existing = await client.query(
    `SELECT source_snapshot_sha256, (SELECT COUNT(*)::int FROM historical_grades WHERE experiment_id=$1) AS count
     FROM historical_experiments WHERE id=$1`, [experiment.id]);
  if (existing.rows[0]?.source_snapshot_sha256 === experiment.source_snapshot_sha256
    && existing.rows[0]?.count === grades.length) return;
  if (existing.rowCount) throw new Error("Historical seed differs from stored data; inspect before replacing");
  if (grades.length !== 6089 * 28) throw new Error("Incomplete historical seed");
  const fields = ["id", "title", "related_report_url", "source_snapshot_sha256",
    "source_evidence_sha256", "published_dataset_revision", "case_count", "configuration_count",
    "prompt_mismatch_count", "expected_mismatch_count", "grading_protocol", "disclosure"];
  await client.query("BEGIN");
  try {
    await client.query(`INSERT INTO historical_experiments (${fields.join(",")})
      VALUES (${fields.map((_, index) => `$${index + 1}`).join(",")})`, fields.map(field => experiment[field]));
    for (let offset = 0; offset < grades.length; offset += 2000) {
      const batch = grades.slice(offset, offset + 2000);
      await client.query(`INSERT INTO historical_grades
        (experiment_id, config_id, case_id, category, audit_status, grade_status, label)
        SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[])`,
      [experiment.id, ...Array.from({ length: 6 }, (_, column) => batch.map(row => row[column]))]);
    }
    await client.query("COMMIT");
    console.log(`Imported ${grades.length} historical grades; no raw answers included.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
