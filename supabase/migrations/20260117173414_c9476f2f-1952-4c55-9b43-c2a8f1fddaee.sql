-- Fix mutable search path for all functions by recreating them with SET search_path = public

-- 1. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 2. create_profile_for_user
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, first_name, last_name)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$function$;

-- 3. is_spotify_token_expired
CREATE OR REPLACE FUNCTION public.is_spotify_token_expired(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT spotify_token_expires_at INTO expires_at
  FROM profiles
  WHERE id = user_id;
  
  RETURN expires_at IS NULL OR expires_at < NOW();
END;
$function$;

-- 4. get_user_spotify_token
CREATE OR REPLACE FUNCTION public.get_user_spotify_token(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  token TEXT;
BEGIN
  SELECT spotify_access_token INTO token
  FROM profiles
  WHERE id = user_id;
  
  RETURN token;
END;
$function$;

-- 5. update_profile_spotify_data
CREATE OR REPLACE FUNCTION public.update_profile_spotify_data(p_user_id uuid, p_access_token text, p_refresh_token text, p_expires_at timestamp with time zone, p_username text)
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
      updated_at = now()
    WHERE id = p_user_id;
  ELSE
    INSERT INTO public.profiles (
      id,
      spotify_access_token,
      spotify_refresh_token,
      spotify_token_expires_at,
      spotify_username,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_access_token,
      p_refresh_token,
      p_expires_at,
      p_username,
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