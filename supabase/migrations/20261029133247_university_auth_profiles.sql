create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, supabase_auth_admin;

create function private.guard_university_account()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data->>'provider', '') <> 'google'
     or lower(split_part(coalesce(new.email, ''), '@', 2)) not in ('g.bracu.ac.bd', 'bracu.ac.bd') then
    raise exception 'Use a BRAC University Google account.' using errcode = '28000';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_university_account() from public, anon, authenticated;
grant execute on function private.guard_university_account() to supabase_auth_admin;
create trigger require_university_google_account
before insert or update of email, raw_app_meta_data on auth.users
for each row execute function private.guard_university_account();

create function private.is_university_member()
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare
  member_id uuid := auth.uid();
  current_session text := auth.jwt()->>'session_id';
begin
  if member_id is null or current_session is null then return false; end if;
  return exists (
    select 1 from auth.users u
    join auth.identities i on i.user_id = u.id and i.provider = 'google'
    where u.id = member_id
      and u.email_confirmed_at is not null
      and lower(split_part(u.email, '@', 2)) in ('g.bracu.ac.bd', 'bracu.ac.bd')
      and lower(i.identity_data->>'email') = lower(u.email)
      and i.identity_data->>'email_verified' = 'true'
      and exists (select 1 from auth.sessions s where s.user_id = member_id and s.id::text = current_session)
  );
end;
$$;
revoke all on function private.is_university_member() from public, anon;
grant execute on function private.is_university_member() to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy profile_read_own on public.profiles for select to authenticated
using ((select auth.uid()) = id and (select private.is_university_member()));
create policy profile_create_own on public.profiles for insert to authenticated
with check ((select auth.uid()) = id and (select private.is_university_member()));
create policy profile_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id and (select private.is_university_member()))
with check ((select auth.uid()) = id and (select private.is_university_member()));
