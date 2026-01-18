-- Add clip timestamp columns to journal_entries for Spotify clip playback
ALTER TABLE public.journal_entries
ADD COLUMN spotify_clip_start_seconds INTEGER NULL,
ADD COLUMN spotify_clip_end_seconds INTEGER NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.journal_entries.spotify_clip_start_seconds IS 'Start timestamp in seconds for Spotify clip playback';
COMMENT ON COLUMN public.journal_entries.spotify_clip_end_seconds IS 'End timestamp in seconds for Spotify clip playback';