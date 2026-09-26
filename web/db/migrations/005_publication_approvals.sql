-- The organization publication request is explicit consent to public release.
ALTER TABLE runs ADD COLUMN najd_approved_by UUID REFERENCES users(id);
ALTER TABLE runs ADD COLUMN najd_approved_at TIMESTAMPTZ;
ALTER TABLE runs ADD CONSTRAINT publication_requires_both_approvals CHECK (
 status <> 'published' OR (
 publication_requested_by IS NOT NULL AND publication_requested_at IS NOT NULL
 AND najd_approved_by IS NOT NULL AND najd_approved_at IS NOT NULL
 AND published_at IS NOT NULL
 )) NOT VALID;
-- NOT VALID preserves legacy rows without inventing approvals; public reads exclude them.
ALTER TABLE evaluation_results ADD COLUMN published_at TIMESTAMPTZ;
COMMENT ON COLUMN evaluation_results.published_at IS 'Actual public release date. NULL means unrecorded for historical imports; never substitute import or evaluation date.';
