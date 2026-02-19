begin;

-- Ensure profile exists for a given auth user id.
create or replace function public.ensure_profile_exists(p_user_id uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_raw_username text;
  v_username text;
begin
  if p_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if exists (select 1 from public.profiles p where p.id = p_user_id) then
    return;
  end if;

  select u.email, nullif(u.raw_user_meta_data ->> 'username', '')
    into v_email, v_raw_username
  from auth.users u
  where u.id = p_user_id;

  v_username := coalesce(v_raw_username, split_part(coalesce(v_email, ''), '@', 1), 'player')
    || '_' || substr(replace(p_user_id::text, '-', ''), 1, 6);

  insert into public.profiles (id, username, role)
  values (p_user_id, v_username, 'player')
  on conflict (id) do nothing;
end;
$$;

-- Backfill existing users who were created before trigger or failed profile creation.
insert into public.profiles (id, username, role)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'username', ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'player'
  ) || '_' || substr(replace(u.id::text, '-', ''), 1, 6),
  'player'::public.app_role
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Make join queue resilient by ensuring profile row exists first.
create or replace function public.fn_join_queue()
returns table(joined boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return query select false, 'Unauthorized';
    return;
  end if;

  perform public.ensure_profile_exists(v_user_id);

  insert into public.match_queue(user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  if found then
    return query select true, 'Joined queue';
  else
    return query select false, 'Already in queue';
  end if;
end;
$$;

commit;
