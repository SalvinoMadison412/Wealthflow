-- Categories get a 4-type kind (income, expense, asset, liability).
-- Run in the Supabase SQL editor (migrations are applied by hand) BEFORE
-- the build that syncs `kind` ships; older rows stay null and the app
-- fills them from the category name on pull.

alter table public.categories add column kind text check (kind in ('income','expense','asset','liability'));
