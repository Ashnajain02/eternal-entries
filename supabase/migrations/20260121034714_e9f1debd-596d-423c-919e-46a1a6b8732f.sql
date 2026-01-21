-- Create a separate, secure table for Spotify credentials
-- This table has NO client-accessible RLS policies - only service role can access
CREATE TABLE public.spotify_credentials (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but with NO policies that allow client access
-- This means only service_role can read/write this table
ALTER TABLE public.spotify_credentials ENABLE ROW LEVEL SECURITY;

-- NO SELECT, INSERT, UPDATE, DELETE policies for regular users
-- Only service_role (used by edge functions) can access this table

-- Add comment explaining the security model
COMMENT ON TABLE public.spotify_credentials IS 'Stores encrypted Spotify OAuth tokens. This table has NO client-accessible RLS policies - only service_role (edge functions) can access it.';

-- Migrate existing token data from profiles to the new table
INSERT INTO public.spotify_credentials (user_id, access_token, refresh_token, token_expires_at, created_at, updated_at)
SELECT 
  id,
  spotify_access_token,
  spotify_refresh_token,
  spotify_token_expires_at,
  created_at,
  updated_at
FROM public.profiles
WHERE spotify_access_token IS NOT NULL 
  AND spotify_refresh_token IS NOT NULL 
  AND spotify_token_expires_at IS NOT NULL;

-- Create or replace the function to update Spotify credentials in the new secure table
CREATE OR REPLACE FUNCTION public.update_spotify_credentials(
  p_user_id uuid, 
  p_access_token text, 
  p_refresh_token text, 
  p_expires_at timestamp with time zone
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.spotify_credentials (
    user_id,
    access_token,
    refresh_token,
    token_expires_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_access_token,
    p_refresh_token,
    p_expires_at,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    token_expires_at = EXCLUDED.token_expires_at,
    updated_at = now();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create function to delete Spotify credentials (for revoke)
CREATE OR REPLACE FUNCTION public.delete_spotify_credentials(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.spotify_credentials WHERE user_id = p_user_id;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_spotify_credentials_updated_at
BEFORE UPDATE ON public.spotify_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();