-- Add status column to journal_entries to track draft vs published
ALTER TABLE public.journal_entries 
ADD COLUMN status text NOT NULL DEFAULT 'published';

-- Add a check constraint to ensure valid status values
ALTER TABLE public.journal_entries
ADD CONSTRAINT journal_entries_status_check 
CHECK (status IN ('draft', 'published'));

-- Create an index for faster querying by status
CREATE INDEX idx_journal_entries_status ON public.journal_entries(status);

-- Update the comment to document the column
COMMENT ON COLUMN public.journal_entries.status IS 'Entry status: draft (not yet published, auto-saved) or published (finalized entry)';