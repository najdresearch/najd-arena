CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, email TEXT UNIQUE,
  "emailVerified" TIMESTAMPTZ, image TEXT
);
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, provider TEXT NOT NULL, "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT, access_token TEXT, expires_at BIGINT, token_type TEXT, scope TEXT,
  id_token TEXT, session_state TEXT,
  UNIQUE(provider, "providerAccountId")
);
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL, token TEXT NOT NULL, expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(identifier, token)
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL,
  provider_org_id TEXT NOT NULL, slug TEXT NOT NULL, name TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE, active_run_limit INTEGER NOT NULL DEFAULT 0,
  monthly_run_limit INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_org_id)
);
CREATE TABLE organization_memberships (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','runner','viewer')),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(organization_id, user_id)
);
CREATE TABLE judge_profiles (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, model TEXT NOT NULL,
  prompt_version TEXT NOT NULL, config_digest TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE runs (
  id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES users(id), status TEXT NOT NULL,
  model_display_name TEXT NOT NULL, model_id TEXT NOT NULL, returned_model_id TEXT,
  identity_status TEXT NOT NULL DEFAULT 'organization_verified', endpoint_url TEXT NOT NULL,
  concurrency INTEGER NOT NULL, rpm INTEGER NOT NULL, tpm INTEGER NOT NULL,
  dataset_version TEXT NOT NULL, dataset_revision TEXT NOT NULL,
  judge_profile_id TEXT REFERENCES judge_profiles(id), total_cases INTEGER NOT NULL,
  completed_cases INTEGER NOT NULL DEFAULT 0, error_count INTEGER NOT NULL DEFAULT 0,
  najd_score DOUBLE PRECISION, case_weighted_score DOUBLE PRECISION,
  coverage DOUBLE PRECISION, track_scores JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX runs_public_score ON runs(najd_score DESC) WHERE status='published';
CREATE INDEX runs_org_created ON runs(organization_id, created_at DESC);
CREATE TABLE run_credentials (
  run_id UUID PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL, nonce TEXT NOT NULL, auth_tag TEXT NOT NULL, key_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
CREATE TABLE case_results (
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE, case_id TEXT NOT NULL,
  track TEXT NOT NULL, source_id TEXT NOT NULL, stage TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL, score DOUBLE PRECISION,
  method TEXT, artifact_key TEXT, usage JSONB NOT NULL DEFAULT '{}', error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(run_id, case_id, stage, attempt)
);
CREATE TABLE run_reviews (
  run_id UUID PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id), decision TEXT NOT NULL,
  reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
  id BIGSERIAL PRIMARY KEY, actor_id UUID REFERENCES users(id), organization_id UUID,
  run_id UUID, action TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
