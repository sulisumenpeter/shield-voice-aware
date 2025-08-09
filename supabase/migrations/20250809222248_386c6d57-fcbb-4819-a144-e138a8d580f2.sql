-- Ensure timestamp trigger function exists
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Calls table
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  direction text not null check (direction in ('inbound','outbound')),
  channel text not null check (channel in ('voice','video')),
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  transcript_summary text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calls enable row level security;

-- RLS policies for calls
create policy if not exists "Users can view their own calls"
  on public.calls for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own calls"
  on public.calls for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own calls"
  on public.calls for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own calls"
  on public.calls for delete
  using (auth.uid() = user_id);

-- Trigger for calls
drop trigger if exists update_calls_updated_at on public.calls;
create trigger update_calls_updated_at
  before update on public.calls
  for each row execute function public.update_updated_at_column();

-- Helpful indexes
create index if not exists idx_calls_user_id on public.calls(user_id);
create index if not exists idx_calls_started_at on public.calls(started_at);

-- Transcripts table
create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  speaker text not null check (speaker in ('user','caller','system')),
  content text not null,
  label text check (label in ('Safe','Suspicious','Scam')),
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transcripts enable row level security;

-- RLS policies for transcripts (owner-only)
create policy if not exists "Users can view their transcripts"
  on public.transcripts for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their transcripts"
  on public.transcripts for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their transcripts"
  on public.transcripts for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their transcripts"
  on public.transcripts for delete
  using (auth.uid() = user_id);

-- Trigger for transcripts
drop trigger if exists update_transcripts_updated_at on public.transcripts;
create trigger update_transcripts_updated_at
  before update on public.transcripts
  for each row execute function public.update_updated_at_column();

-- Indexes for transcripts
create index if not exists idx_transcripts_call_id on public.transcripts(call_id);
create index if not exists idx_transcripts_user_id on public.transcripts(user_id);

-- Alerts table
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  level text not null check (level in ('info','warning','danger')),
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alerts enable row level security;

-- RLS policies for alerts (owner-only)
create policy if not exists "Users can view their alerts"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their alerts"
  on public.alerts for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their alerts"
  on public.alerts for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their alerts"
  on public.alerts for delete
  using (auth.uid() = user_id);

-- Trigger for alerts
drop trigger if exists update_alerts_updated_at on public.alerts;
create trigger update_alerts_updated_at
  before update on public.alerts
  for each row execute function public.update_updated_at_column();

-- Indexes for alerts
create index if not exists idx_alerts_call_id on public.alerts(call_id);
create index if not exists idx_alerts_user_id on public.alerts(user_id);