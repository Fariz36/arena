begin;

-- Public matchmaking RPC intended for realtime-driven queue flows.
create or replace function public.fn_matchmake_1v1_public(p_question_count integer default 5)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_arena_id uuid;
  p1 uuid;
  p2 uuid;
  selected_count integer;
begin
  with selected as (
    select mq.user_id
    from public.match_queue mq
    order by mq.joined_at asc
    limit 2
    for update skip locked
  )
  select min(user_id), max(user_id) into p1, p2 from selected;

  if p1 is null or p2 is null or p1 = p2 then
    return null;
  end if;

  insert into public.arenas(status, question_count, start_time)
  values ('active', p_question_count, now())
  returning id into v_arena_id;

  insert into public.arena_players(arena_id, user_id)
  values
    (v_arena_id, p1),
    (v_arena_id, p2);

  with q as (
    select q.id, row_number() over (order by random()) as rn
    from public.questions q
    where q.is_active = true
    limit p_question_count
  )
  insert into public.arena_questions(arena_id, question_id, question_no, question_start_time)
  select
    v_arena_id,
    q.id,
    q.rn,
    now() + ((q.rn - 1) * interval '20 seconds')
  from q;

  get diagnostics selected_count = row_count;
  if selected_count < p_question_count then
    raise exception 'Not enough active questions. Need %, got %', p_question_count, selected_count;
  end if;

  delete from public.match_queue where user_id in (p1, p2);

  return v_arena_id;
end;
$$;

grant execute on function public.fn_matchmake_1v1_public(integer) to authenticated;

-- Realtime publication for PvP event delivery via postgres_changes.
alter table public.match_queue replica identity full;
alter table public.arenas replica identity full;
alter table public.arena_players replica identity full;
alter table public.arena_questions replica identity full;
alter table public.answers replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'match_queue'
  ) then
    alter publication supabase_realtime add table public.match_queue;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'arenas'
  ) then
    alter publication supabase_realtime add table public.arenas;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'arena_players'
  ) then
    alter publication supabase_realtime add table public.arena_players;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'arena_questions'
  ) then
    alter publication supabase_realtime add table public.arena_questions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'answers'
  ) then
    alter publication supabase_realtime add table public.answers;
  end if;
end;
$$;

commit;
