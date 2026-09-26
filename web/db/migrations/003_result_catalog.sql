-- Public read model. No credentials, prompts, answers, or endpoint URLs belong here.
CREATE TABLE model_catalog (
 id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
 provider_name TEXT NOT NULL, logo_url TEXT, color TEXT NOT NULL DEFAULT '#237757',
 specifications JSONB NOT NULL DEFAULT '{}', organization_id UUID REFERENCES organizations(id),
 visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public'))
);
CREATE TABLE evaluation_releases (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, protocol TEXT NOT NULL,
 dataset_revision TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}',
 visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE evaluation_results (
 id TEXT PRIMARY KEY, release_id TEXT NOT NULL REFERENCES evaluation_releases(id),
 model_id TEXT NOT NULL REFERENCES model_catalog(id), run_id UUID REFERENCES runs(id),
 execution TEXT NOT NULL, thinking TEXT NOT NULL, total INTEGER NOT NULL CHECK(total>0),
 acceptable INTEGER NOT NULL CHECK(acceptable>=0 AND acceptable<=total),
 technical INTEGER NOT NULL CHECK(technical>=0 AND technical<=total),
 tracks JSONB NOT NULL DEFAULT '[]', metrics JSONB NOT NULL DEFAULT '{}',
 visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
 UNIQUE(release_id,model_id,execution,thinking)
);
CREATE INDEX evaluation_public ON evaluation_results(release_id,model_id) WHERE visibility='public';
