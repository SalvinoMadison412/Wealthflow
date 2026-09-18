-- Rules + the categories they point at, per user. Ids are the same random
-- strings the on-device SQLite rows use, so a pull restores them verbatim.
-- Transactions never come here (CLAUDE.md).
create table public.categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  color_index int not null,
  bucket text not null check (bucket in ('needs', 'wants', 'savings')),
  monthly_budget numeric,
  position int not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table public.rules (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  merchant_pattern text,
  amount_json text,
  category_id text not null,
  enabled boolean not null default true,
  position int not null,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.categories enable row level security;
alter table public.rules enable row level security;
create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rules" on public.rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
