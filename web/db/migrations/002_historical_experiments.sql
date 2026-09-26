-- Archived runs keep their original scoring protocol and never enter the live leaderboard.
CREATE TABLE historical_experiments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  related_report_url TEXT NOT NULL,
  source_snapshot_sha256 TEXT NOT NULL,
  source_evidence_sha256 TEXT NOT NULL,
  published_dataset_revision TEXT NOT NULL,
  case_count INTEGER NOT NULL CHECK (case_count > 0),
  configuration_count INTEGER NOT NULL CHECK (configuration_count > 0),
  prompt_mismatch_count INTEGER NOT NULL,
  expected_mismatch_count INTEGER NOT NULL,
  grading_protocol TEXT NOT NULL,
  disclosure TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE historical_grades (
  experiment_id TEXT NOT NULL REFERENCES historical_experiments(id) ON DELETE CASCADE,
  config_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  category TEXT NOT NULL,
  audit_status TEXT NOT NULL CHECK (audit_status IN ('certified', 'quarantined')),
  grade_status TEXT NOT NULL CHECK (grade_status IN ('ok', 'technical_failure')),
  label TEXT CHECK (label IN ('correct', 'possible_correct', 'partial_correct', 'wrong')),
  PRIMARY KEY (experiment_id, config_id, case_id),
  CHECK ((grade_status = 'ok') = (label IS NOT NULL))
);
CREATE INDEX historical_grades_config ON historical_grades(experiment_id, config_id);
CREATE INDEX historical_grades_case ON historical_grades(experiment_id, case_id);
