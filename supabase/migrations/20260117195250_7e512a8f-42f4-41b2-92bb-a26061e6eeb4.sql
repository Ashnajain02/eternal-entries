-- Delete duplicate draft rows keeping only the earliest created for each (user_id, timestamp_started)
DELETE FROM public.journal_entries
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, timestamp_started ORDER BY created_at ASC) as rn
    FROM public.journal_entries
    WHERE status = 'draft'
  ) sub
  WHERE sub.rn > 1
);

-- Create unique partial index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_unique_user_draft_timestamp
  ON public.journal_entries (user_id, timestamp_started)
  WHERE status = 'draft';