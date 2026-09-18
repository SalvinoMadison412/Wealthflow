-- Profile fields collected at onboarding. Non-sensitive preferences only
-- (CLAUDE.md): transactions never leave the device.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  age_range text,    -- '18-24' | '25-34' | '35-44' | '45-54' | '55+'
  income_range text, -- '<25k' | '25k-50k' | '50k-1L' | '1L-2L' | '2L+'
  goal text,         -- 'track' | 'budget' | 'save' | 'debt'
  occupation text,   -- 'salaried' | 'self_employed' | 'student' | 'business' | 'other'
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
