begin;

create or replace function public.fn_matchmake_1v1(p_question_count integer default 5)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_arena_id uuid;
  p1 uuid;
  p2 uuid;
  v_players uuid[];
  selected_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Forbidden';
  end if;

  with selected as (
    select mq.user_id, mq.joined_at
    from public.match_queue mq
    order by mq.joined_at asc
    limit 2
    for update skip locked
  )
  select array_agg(s.user_id order by s.joined_at asc, s.user_id asc)
  into v_players
  from selected s;

  p1 := v_players[1];
  p2 := v_players[2];

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
  v_players uuid[];
  selected_count integer;
begin
  with selected as (
    select mq.user_id, mq.joined_at
    from public.match_queue mq
    order by mq.joined_at asc
    limit 2
    for update skip locked
  )
  select array_agg(s.user_id order by s.joined_at asc, s.user_id asc)
  into v_players
  from selected s;

  p1 := v_players[1];
  p2 := v_players[2];

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

commit;
