-- Spend Lens — Phase 2: family profile + optional kid profiles
-- Tables: profiles, families, children  (+ Row Level Security)
--
-- Run this in the Supabase SQL editor, or with the Supabase CLI:
--   supabase db push           (if using the CLI migration workflow)
-- It is idempotent (safe to re-run).

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at fresh on UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — parent metadata, 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- families — the data container; everything chains to this
-- ---------------------------------------------------------------------------
create table if not exists public.families (
  id             uuid primary key default gen_random_uuid(),
  owner_user_id  uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists families_owner_user_id_idx
  on public.families (owner_user_id);

-- ---------------------------------------------------------------------------
-- children — optional kid profiles (first names / nicknames only)
-- ---------------------------------------------------------------------------
create table if not exists public.children (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families(id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);
create index if not exists children_family_id_idx
  on public.children (family_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_families_updated_at on public.families;
create trigger set_families_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

drop trigger if exists set_children_updated_at on public.children;
create trigger set_children_updated_at
  before update on public.children
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security — users can only access their own data
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.children enable row level security;

-- profiles: only your own row
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (user_id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- families: only families you own
drop policy if exists families_select_own on public.families;
create policy families_select_own on public.families
  for select using (owner_user_id = auth.uid());

drop policy if exists families_insert_own on public.families;
create policy families_insert_own on public.families
  for insert with check (owner_user_id = auth.uid());

drop policy if exists families_update_own on public.families;
create policy families_update_own on public.families
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists families_delete_own on public.families;
create policy families_delete_own on public.families
  for delete using (owner_user_id = auth.uid());

-- children: scoped through the owning family
drop policy if exists children_select_own on public.children;
create policy children_select_own on public.children
  for select using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists children_insert_own on public.children;
create policy children_insert_own on public.children
  for insert with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists children_update_own on public.children;
create policy children_update_own on public.children
  for update using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  ) with check (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );

drop policy if exists children_delete_own on public.children;
create policy children_delete_own on public.children
  for delete using (
    family_id in (select id from public.families where owner_user_id = auth.uid())
  );
