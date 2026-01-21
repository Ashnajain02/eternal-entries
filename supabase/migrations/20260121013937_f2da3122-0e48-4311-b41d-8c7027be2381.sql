-- Fix 1: Remove unused SECURITY DEFINER function that bypasses RLS
DROP FUNCTION IF EXISTS public.get_user_spotify_token(uuid);

-- Fix 2: Add missing DELETE policy for profiles table
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);

-- Fix 3: Add missing DELETE policy for daily_all_habits_completed table
CREATE POLICY "Users can delete their own daily completions" 
ON public.daily_all_habits_completed 
FOR DELETE 
USING (auth.uid() = user_id);