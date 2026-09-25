-- Lets a signed-in user delete their own account (Play requires in-app deletion).
-- Removing the auth user cascades to profiles, categories and rules
-- (all reference auth.users on delete cascade). Transactions were never here.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
