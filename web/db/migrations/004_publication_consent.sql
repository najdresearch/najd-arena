ALTER TABLE runs ADD COLUMN publication_requested_at TIMESTAMPTZ;
ALTER TABLE runs ADD COLUMN publication_requested_by UUID REFERENCES users(id);
