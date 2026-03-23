-- Add timezone column to journal_entries
-- Stores the IANA timezone (e.g. "America/New_York") the user was in when writing
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS timezone TEXT;
