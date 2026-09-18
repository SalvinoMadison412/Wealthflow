-- The Wants budget bucket is removed; categories are Needs or Savings.
-- Run in the Supabase SQL editor (migrations are applied by hand).

update public.categories set bucket = 'needs' where bucket = 'wants';

alter table public.categories drop constraint if exists categories_bucket_check;
alter table public.categories
  add constraint categories_bucket_check check (bucket in ('needs', 'savings'));
