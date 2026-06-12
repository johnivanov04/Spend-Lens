-- Spend Lens — Phase 3: transaction ingestion
-- Tables: transactions, csv_imports  (+ Row Level Security)
--
-- Run AFTER 0001_phase2_family_schema.sql, in the Supabase SQL editor or via the
-- Supabase CLI. Idempotent (safe to re-run). Reuses public.set_updated_at() from
-- the Phase 2 migration.

-- ---------------------------------------------------------------------------
-- transactions — raw transaction data from manual entry / receipt / CSV
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families(id) on delete cascade,
  source_type       text not null
                    check (source_type in (
                      'manual', 'receipt_paste', 'csv_upload',
                      'email_forward_later', 'bank_feed_later'
                    )),
  merchant          text,
  description       text,
  amount            numeric not null,
  currency          text not null default 'USD',
  transaction_date  date not null,
  raw_text          text,
  source_file_name  text,
  duplicate_key     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists transactions_family_id_idx
  on public.transactions (family_id);
-- Non-unique: duplicates are detected/flagged in-app, not hard-blocked, so a
-- parent can still keep two genuinely-identical charges if they choose.
create index if not exists transactions_family_dupkey_idx
  on public.transactions (family_id, duplicate_key);

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- csv_imports — one row per CSV upload session
-- ---------------------------------------------------------------------------
create table if not exists public.csv_imports (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families(id) on delete cascade,
  file_name      text,
  row_count      integer,
  created_count  integer,
  skipped_count  integer,
  failed_count   integer,
  status         text,
  created_at     timestamptz not null default now()
);
create index if not exists csv_imports_family_id_idx
  on public.csv_imports (family_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — scoped through the owning family
-- ---------------------------------------------------------------------------
alter table public.transactions enable row level security;
alter table public.csv_imports enable row level security;

-- transactions
drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions
  for update using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  ) with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own on public.transactions
  for delete using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

-- csv_imports
drop policy if exists csv_imports_select_own on public.csv_imports;
create policy csv_imports_select_own on public.csv_imports
  for select using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists csv_imports_insert_own on public.csv_imports;
create policy csv_imports_insert_own on public.csv_imports
  for insert with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists csv_imports_update_own on public.csv_imports;
create policy csv_imports_update_own on public.csv_imports
  for update using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  ) with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists csv_imports_delete_own on public.csv_imports;
create policy csv_imports_delete_own on public.csv_imports
  for delete using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );
