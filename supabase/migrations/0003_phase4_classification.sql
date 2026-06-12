-- Spend Lens — Phase 4: AI classification
-- Tables: transaction_classifications, merchant_rules  (+ Row Level Security)
--
-- Run AFTER 0001 and 0002, in the Supabase SQL editor or via the CLI.
-- Idempotent. Reuses public.set_updated_at() from the Phase 2 migration.

-- ---------------------------------------------------------------------------
-- transaction_classifications — one current classification per transaction
-- ---------------------------------------------------------------------------
create table if not exists public.transaction_classifications (
  id                      uuid primary key default gen_random_uuid(),
  transaction_id          uuid not null unique references public.transactions(id) on delete cascade,
  family_id               uuid not null references public.families(id) on delete cascade,
  platform                text,
  merchant_family         text,
  category                text,
  kid_related_likelihood  text not null
                          check (kid_related_likelihood in ('yes', 'no', 'unclear')),
  confidence_score        numeric not null,
  confidence_label        text not null
                          check (confidence_label in ('high', 'medium', 'low', 'unclassified')),
  child_id                uuid references public.children(id) on delete set null,
  explanation             text not null,
  needs_review            boolean not null default true,
  model_provider          text,
  model_name              text,
  raw_model_output        jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists txn_class_family_id_idx
  on public.transaction_classifications (family_id);
create index if not exists txn_class_needs_review_idx
  on public.transaction_classifications (family_id, needs_review);

drop trigger if exists set_txn_class_updated_at on public.transaction_classifications;
create trigger set_txn_class_updated_at
  before update on public.transaction_classifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- merchant_rules — parent-specific learned rules applied before calling AI
-- ---------------------------------------------------------------------------
create table if not exists public.merchant_rules (
  id                      uuid primary key default gen_random_uuid(),
  family_id               uuid not null references public.families(id) on delete cascade,
  normalized_merchant     text not null,
  platform                text,
  merchant_family         text,
  category                text,
  child_id                uuid references public.children(id) on delete set null,
  kid_related_likelihood  text
                          check (kid_related_likelihood is null
                                 or kid_related_likelihood in ('yes', 'no', 'unclear')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (family_id, normalized_merchant)
);
create index if not exists merchant_rules_family_id_idx
  on public.merchant_rules (family_id);

drop trigger if exists set_merchant_rules_updated_at on public.merchant_rules;
create trigger set_merchant_rules_updated_at
  before update on public.merchant_rules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — scoped through the owning family
-- ---------------------------------------------------------------------------
alter table public.transaction_classifications enable row level security;
alter table public.merchant_rules enable row level security;

-- transaction_classifications
drop policy if exists txn_class_select_own on public.transaction_classifications;
create policy txn_class_select_own on public.transaction_classifications
  for select using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists txn_class_insert_own on public.transaction_classifications;
create policy txn_class_insert_own on public.transaction_classifications
  for insert with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists txn_class_update_own on public.transaction_classifications;
create policy txn_class_update_own on public.transaction_classifications
  for update using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  ) with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists txn_class_delete_own on public.transaction_classifications;
create policy txn_class_delete_own on public.transaction_classifications
  for delete using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

-- merchant_rules
drop policy if exists merchant_rules_select_own on public.merchant_rules;
create policy merchant_rules_select_own on public.merchant_rules
  for select using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists merchant_rules_insert_own on public.merchant_rules;
create policy merchant_rules_insert_own on public.merchant_rules
  for insert with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists merchant_rules_update_own on public.merchant_rules;
create policy merchant_rules_update_own on public.merchant_rules
  for update using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  ) with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists merchant_rules_delete_own on public.merchant_rules;
create policy merchant_rules_delete_own on public.merchant_rules
  for delete using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );
