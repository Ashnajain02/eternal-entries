-- Add disable_song_blur preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS disable_song_blur boolean NOT NULL DEFAULT false;