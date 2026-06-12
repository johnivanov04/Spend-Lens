-- Spend Lens — Phase 6: weekly summary previews
-- Table: weekly_summaries  (+ Row Level Security)
--
-- Run AFTER 0001–0003, in the Supabase SQL editor or via the CLI.
-- Idempotent. Reuses public.set_updated_at() from the Phase 2 migration.

-- ---------------------------------------------------------------------------
-- weekly_summaries — one saved preview per family + period
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_summaries (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  summary_json  jsonb not null,
  summary_text  text not null,
  status        text not null default 'preview'
                check (status in ('preview', 'sent', 'failed')),
  emailed_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Unique per period so "Regenerate preview" upserts the current week's row.
  unique (family_id, period_start, period_end)
);
create index if not exists weekly_summaries_family_id_idx
  on public.weekly_summaries (family_id);
create index if not exists weekly_summaries_family_period_idx
  on public.weekly_summaries (family_id, period_start, period_end);

drop trigger if exists set_weekly_summaries_updated_at on public.weekly_summaries;
create trigger set_weekly_summaries_updated_at
  before update on public.weekly_summaries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — scoped through the owning family
-- ---------------------------------------------------------------------------
alter table public.weekly_summaries enable row level security;

drop policy if exists weekly_summaries_select_own on public.weekly_summaries;
create policy weekly_summaries_select_own on public.weekly_summaries
  for select using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists weekly_summaries_insert_own on public.weekly_summaries;
create policy weekly_summaries_insert_own on public.weekly_summaries
  for insert with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists weekly_summaries_update_own on public.weekly_summaries;
create policy weekly_summaries_update_own on public.weekly_summaries
  for update using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  ) with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists weekly_summaries_delete_own on public.weekly_summaries;
create policy weekly_summaries_delete_own on public.weekly_summaries
  for delete using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );
