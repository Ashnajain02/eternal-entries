
CREATE TABLE public.visit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  city text,
  region text,
  country text,
  latitude numeric,
  longitude numeric
);

ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own visit logs" ON public.visit_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visit logs" ON public.visit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
