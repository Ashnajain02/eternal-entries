-- API Keys table for journal-stats endpoint
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  rate_limit_count int not null default 0,
  rate_limit_reset_at timestamptz not null default now(),
  unique (user_id)
);

-- RLS
alter table public.api_keys enable row level security;

-- Users can only read/delete their own key
create policy "Users can view own api key" on public.api_keys
  for select using (auth.uid() = user_id);

create policy "Users can insert own api key" on public.api_keys
  for insert with check (auth.uid() = user_id);

create policy "Users can update own api key" on public.api_keys
  for update using (auth.uid() = user_id);

create policy "Users can delete own api key" on public.api_keys
  for delete using (auth.uid() = user_id);
