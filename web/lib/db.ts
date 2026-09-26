import {cache} from "react";
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
    SELECT r.*, m.role, o.name AS organization FROM runs r
    JOIN organizations o ON o.id = r.organization_id
    JOIN organization_memberships m ON m.organization_id = o.id
    WHERE m.user_id = $1 ORDER BY r.created_at DESC`, [userId]);
  return result.rows.map((row) => ({
    id: row.id, rank: 0, modelName: row.model_display_name, modelId: row.model_id,
    organization: row.organization, score: Number(row.najd_score ?? 0),
    caseWeightedScore: Number(row.case_weighted_score ?? 0), coverage: Number(row.coverage ?? 0),
    datasetVersion: row.dataset_version, judgeProfile: row.judge_profile_id ?? "pending",
    publishedAt: row.published_at?.toISOString() ?? "", tracks: row.track_scores ?? [],
    canRequestPublication: row.role === "admin", publicationRequested: !!row.publication_requested_at,
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

export type ResultBreakdown = {
  name: string;
  total: number;
  acceptable: number;
  technical: number;
};

export type PublicEvaluation = {
  catalog: CatalogModel[];
  metrics: Array<{config:string;total:number;medianSeconds?:number;p95Seconds?:number;timedOutputs?:number;[key:string]:unknown}>;
  title: string;
  reportUrl: string;
  datasetRevision: string;
  caseCount: number;
  configurationCount: number;
  promptMismatchCount: number;
  expectedMismatchCount: number;
  disclosure: string;
  models: Array<ResultBreakdown & { configurations: number }>;
  configurations: Array<ResultBreakdown & { model: string; execution:string;thinking:string }>;
  configurationTracks: Array<ResultBreakdown & { model: string; config: string }>;
  tracks: Array<ResultBreakdown & { model: string }>;
};

export type CatalogModel = {id:string;slug:string;displayName:string;providerName:string;logoUrl:string|null;color:string;specifications:Record<string,string>};
export const publicEvaluation=cache(async function publicEvaluation(): Promise<PublicEvaluation | null> {
 if(!process.env.DATABASE_URL)return null;
 const {rows:[release]}=await pool.query(`SELECT * FROM evaluation_releases e WHERE visibility='public' AND EXISTS(SELECT 1 FROM evaluation_results r JOIN model_catalog m ON m.id=r.model_id WHERE r.release_id=e.id AND r.visibility='public' AND m.visibility='public') ORDER BY created_at DESC,id LIMIT 1`);
 if(!release)return null;
 const {rows}=await pool.query(`SELECT r.*,m.slug,m.display_name,m.provider_name,m.logo_url,m.color,m.specifications FROM evaluation_results r JOIN model_catalog m ON m.id=r.model_id WHERE r.release_id=$1 AND r.visibility='public' AND m.visibility='public' ORDER BY m.display_name,r.execution,r.thinking`,[release.id]);
 const catalog:CatalogModel[]=Array.from(new Map(rows.map(r=>[r.model_id,{id:r.model_id,slug:r.slug,displayName:r.display_name,providerName:r.provider_name,logoUrl:r.logo_url,color:r.color,specifications:r.specifications}])).values());
 const configurations=rows.map(r=>({name:r.id,model:r.model_id,execution:r.execution,thinking:r.thinking,total:r.total,acceptable:r.acceptable,technical:r.technical}));
 const configurationTracks=rows.flatMap(r=>r.tracks.map((t:ResultBreakdown)=>({...t,config:r.id,model:r.model_id})));
 const models=catalog.map(m=>{const selected=configurations.filter(r=>r.model===m.id);return {name:m.id,configurations:selected.length,total:selected.reduce((s,r)=>s+r.total,0),acceptable:selected.reduce((s,r)=>s+r.acceptable,0),technical:selected.reduce((s,r)=>s+r.technical,0)};});
 const tracks:Array<ResultBreakdown & {model:string}>=[];
 for(const t of configurationTracks){let group=tracks.find(r=>r.model===t.model&&r.name===t.name);if(!group){group={name:t.name,model:t.model,total:0,acceptable:0,technical:0};tracks.push(group);}group.total+=t.total;group.acceptable+=t.acceptable;group.technical+=t.technical;}
 const meta=release.metadata;
 return {catalog,metrics:rows.map(r=>({...r.metrics,config:r.id,total:r.total})),title:release.title,reportUrl:meta.related_report_url??'',datasetRevision:release.dataset_revision,caseCount:meta.case_count??0,configurationCount:rows.length,promptMismatchCount:meta.prompt_mismatch_count??0,expectedMismatchCount:meta.expected_mismatch_count??0,disclosure:meta.disclosure??'',models,configurations,configurationTracks,tracks};
});
