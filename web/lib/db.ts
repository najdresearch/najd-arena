import { Pool } from "pg";
import type { PrivateRun, PublishedRun } from "./types";

const globalForDb = globalThis as unknown as { arenaPool?: Pool };
export const pool = globalForDb.arenaPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
  query_timeout: 10000,
});
if (process.env.NODE_ENV !== "production") globalForDb.arenaPool = pool;

export async function publishedRuns(): Promise<PublishedRun[]> {
  if (!process.env.DATABASE_URL) return [];
  const result = await pool.query(`
    SELECT r.id, r.model_display_name, r.model_id, o.name AS organization,
      r.najd_score, r.case_weighted_score, r.coverage, r.dataset_version,
      r.judge_profile_id, r.published_at, r.track_scores
    FROM runs r JOIN organizations o ON o.id = r.organization_id
    WHERE r.status = 'published' ORDER BY r.najd_score DESC, r.published_at ASC`);
  return result.rows.map((row, index) => ({
    id: row.id, rank: index + 1, modelName: row.model_display_name, modelId: row.model_id,
    organization: row.organization, score: Number(row.najd_score),
    caseWeightedScore: Number(row.case_weighted_score), coverage: Number(row.coverage),
    datasetVersion: row.dataset_version, judgeProfile: row.judge_profile_id,
    publishedAt: row.published_at.toISOString(), tracks: row.track_scores ?? [],
  }));
}

export async function runById(id: string): Promise<PublishedRun | null> {
  return (await publishedRuns()).find((run) => run.id === id) ?? null;
}

export async function organizationRuns(userId: string): Promise<PrivateRun[]> {
  if (!process.env.DATABASE_URL) return [];
  const result = await pool.query(`
    SELECT r.*, o.name AS organization FROM runs r
    JOIN organizations o ON o.id = r.organization_id
    JOIN organization_memberships m ON m.organization_id = o.id
    WHERE m.user_id = $1 ORDER BY r.created_at DESC`, [userId]);
  return result.rows.map((row) => ({
    id: row.id, rank: 0, modelName: row.model_display_name, modelId: row.model_id,
    organization: row.organization, score: Number(row.najd_score ?? 0),
    caseWeightedScore: Number(row.case_weighted_score ?? 0), coverage: Number(row.coverage ?? 0),
    datasetVersion: row.dataset_version, judgeProfile: row.judge_profile_id ?? "pending",
    publishedAt: row.published_at?.toISOString() ?? "", tracks: row.track_scores ?? [],
    status: row.status, completedCases: row.completed_cases, totalCases: row.total_cases,
    errors: row.error_count,
  }));
}

export async function organizationsForUser(userId: string) {
  if (!process.env.DATABASE_URL) return [];
  const result = await pool.query(`SELECT o.id, o.name, o.slug, o.approved,
    o.active_run_limit, m.role FROM organizations o JOIN organization_memberships m
    ON m.organization_id=o.id WHERE m.user_id=$1 ORDER BY o.name`, [userId]);
  return result.rows as Array<{id: string; name: string; slug: string; approved: boolean;
    active_run_limit: number; role: string}>;
}

export type HistoricalBreakdown = {
  name: string;
  total: number;
  acceptable: number;
  technical: number;
};

export type HistoricalExperiment = {
  title: string;
  reportUrl: string;
  datasetRevision: string;
  caseCount: number;
  configurationCount: number;
  promptMismatchCount: number;
  expectedMismatchCount: number;
  disclosure: string;
  models: Array<HistoricalBreakdown & { configurations: number }>;
  configurations: Array<HistoricalBreakdown & { model: string }>;
  tracks: Array<HistoricalBreakdown & { model: string }>;
};

export async function historicalM3Experiment(): Promise<HistoricalExperiment | null> {
  if (!process.env.DATABASE_URL) return null;
  const id = "humain-m3-vs-minimax-m3-preaudit-20260909";
  const [experiment, groups] = await Promise.all([
    pool.query(`SELECT title, related_report_url, published_dataset_revision, case_count,
      configuration_count, prompt_mismatch_count, expected_mismatch_count, disclosure
      FROM historical_experiments WHERE id=$1`, [id]),
    pool.query(`SELECT kind, name, model, COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE label IN ('correct', 'possible_correct'))::int AS acceptable,
      COUNT(*) FILTER (WHERE grade_status='technical_failure')::int AS technical,
      COUNT(DISTINCT config_id)::int AS configurations
      FROM (
        SELECT 'model' AS kind, split_part(config_id, '--', 1) AS name,
          split_part(config_id, '--', 1) AS model, config_id, label, grade_status
        FROM historical_grades WHERE experiment_id=$1
        UNION ALL
        SELECT 'configuration', config_id, split_part(config_id, '--', 1), config_id, label, grade_status
        FROM historical_grades WHERE experiment_id=$1
        UNION ALL
        SELECT 'track', category, split_part(config_id, '--', 1), config_id, label, grade_status
        FROM historical_grades WHERE experiment_id=$1
      ) grouped GROUP BY kind, name, model ORDER BY kind, name, model`, [id]),
  ]);
  if (experiment.rowCount === 0) return null;
  const row = experiment.rows[0];
  const format = (item: Record<string, unknown>): HistoricalBreakdown => ({
    name: String(item.name), total: Number(item.total), acceptable: Number(item.acceptable),
    technical: Number(item.technical),
  });
  return {
    title: row.title, reportUrl: row.related_report_url,
    datasetRevision: row.published_dataset_revision, caseCount: row.case_count,
    configurationCount: row.configuration_count, promptMismatchCount: row.prompt_mismatch_count,
    expectedMismatchCount: row.expected_mismatch_count, disclosure: row.disclosure,
    models: groups.rows.filter((item) => item.kind === 'model').map((item) => ({
      ...format(item), configurations: Number(item.configurations),
    })),
    configurations: groups.rows.filter((item) => item.kind === 'configuration').map((item) => ({
      ...format(item), model: item.model,
    })),
    tracks: groups.rows.filter((item) => item.kind === 'track').map((item) => ({
      ...format(item), model: item.model,
    })),
  };
}
