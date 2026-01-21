-- Add spotify_is_premium column to profiles table to store premium status at connection time
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS spotify_is_premium boolean DEFAULT NULL;

-- Update the update_profile_spotify_data function to include premium status
CREATE OR REPLACE FUNCTION public.update_profile_spotify_data(
  p_user_id uuid, 
  p_access_token text, 
  p_refresh_token text, 
  p_expires_at timestamp with time zone, 
  p_username text,
  p_is_premium boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  profile_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO profile_exists;
  
  IF profile_exists THEN
    UPDATE public.profiles
    SET 
      spotify_access_token = p_access_token,
      spotify_refresh_token = p_refresh_token,
      spotify_token_expires_at = p_expires_at,
      spotify_username = p_username,
      spotify_is_premium = p_is_premium,
      updated_at = now()
    WHERE id = p_user_id;
  ELSE
    INSERT INTO public.profiles (
      id,
      spotify_access_token,
      spotify_refresh_token,
      spotify_token_expires_at,
      spotify_username,
      spotify_is_premium,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_access_token,
      p_refresh_token,
      p_expires_at,
      p_username,
      p_is_premium,
      now(),
      now()
    );
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$;