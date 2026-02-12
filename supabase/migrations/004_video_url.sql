-- Add video_url column to events table
-- Supports YouTube, Vimeo, and Google Drive video links

ALTER TABLE events ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN events.video_url IS 'Optional video URL (YouTube, Vimeo, or Google Drive link)';
