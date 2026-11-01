CREATE TABLE IF NOT EXISTS log_events (
  event_id UUID,
  timestamp DateTime MATERIALIZED now(),
  video_id String,
  job_id String,
  log String,
  metadata Nullable(String)
)
ENGINE=MergeTree PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp)
