
-- Add optional fields used by the app and to persist anti-spoof results
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS spoof_score numeric,
  ADD COLUMN IF NOT EXISTS spoof_label text;

-- Helpful index for reading user transcripts by time
CREATE INDEX IF NOT EXISTS idx_transcripts_user_created_at
  ON public.transcripts (user_id, created_at);
