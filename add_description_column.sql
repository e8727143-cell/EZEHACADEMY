ALTER TABLE niches ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE niches ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE niches ADD COLUMN IF NOT EXISTS thumbnail text;
ALTER TABLE niches ADD COLUMN IF NOT EXISTS subscriber_count text;
ALTER TABLE niches ADD COLUMN IF NOT EXISTS video_count text;
ALTER TABLE niches ADD COLUMN IF NOT EXISTS view_count text;
