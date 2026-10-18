-- Import bug reports sent from the "Report bug" button when a statement
-- isn't fully read. Counts, bank and the user's note only: never
-- transactions, narrations or the PDF (CLAUDE.md: on-device only).
-- Clients can only insert their own row; read reports in the dashboard.
create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bank text not null,
  failed_count int not null,
  unread_count int not null,
  mismatch_count int not null,
  rows_read int not null,
  files int not null,
  failed_files int not null,
  message text,
  app_version text,
  platform text,
  created_at timestamptz not null default now()
);
alter table public.bug_reports enable row level security;
create policy "insert own bug report" on public.bug_reports
  for insert to authenticated with check (auth.uid() = user_id);
