begin;

create or replace function public.fn_apply_arena_finish_side_effects(p_arena_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_count integer;
  v_p1_user_id uuid;
  v_p2_user_id uuid;
  v_p1_rank integer;
  v_p2_rank integer;
  v_p1_rating integer;
  v_p2_rating integer;
  v_sa numeric;
  v_sb numeric;
  v_ea numeric;
  v_eb numeric;
  v_k_factor integer := 32;
  v_p1_new_rating integer;
  v_p2_new_rating integer;
begin
  with ranked as (
    select
      ap.id,
      dense_rank() over (
        order by ap.total_score desc, ap.correct_count desc, ap.joined_at asc
      ) as rnk
    from public.arena_players ap
    where ap.arena_id = p_arena_id
  )
  update public.arena_players ap
  set final_rank = ranked.rnk
  from ranked
  where ap.id = ranked.id;

  with summary as (
    select
      ap.user_id,
      ap.total_score,
      ap.final_rank
    from public.arena_players ap
    where ap.arena_id = p_arena_id
  )
  update public.profiles p
  set
    total_matches = p.total_matches + 1,
    win_count = p.win_count + case when s.final_rank = 1 then 1 else 0 end,
    avg_score = round(((p.avg_score * p.total_matches) + s.total_score)::numeric / (p.total_matches + 1), 2)
  from summary s
  where p.id = s.user_id;

  select count(*)::integer
    into v_player_count
  from public.arena_players ap
  where ap.arena_id = p_arena_id;

  if v_player_count = 2 then
    select ap.user_id, ap.final_rank, p.rating
      into v_p1_user_id, v_p1_rank, v_p1_rating
    from public.arena_players ap
    join public.profiles p on p.id = ap.user_id
    where ap.arena_id = p_arena_id
    order by ap.joined_at asc
    limit 1;

    select ap.user_id, ap.final_rank, p.rating
      into v_p2_user_id, v_p2_rank, v_p2_rating
    from public.arena_players ap
    join public.profiles p on p.id = ap.user_id
    where ap.arena_id = p_arena_id
    order by ap.joined_at asc
    offset 1
    limit 1;

    if v_p1_rank = v_p2_rank then
      v_sa := 0.5;
      v_sb := 0.5;
    elsif v_p1_rank < v_p2_rank then
      v_sa := 1;
      v_sb := 0;
    else
      v_sa := 0;
      v_sb := 1;
    end if;

    v_ea := 1 / (1 + power(10::numeric, (v_p2_rating - v_p1_rating)::numeric / 400));
    v_eb := 1 / (1 + power(10::numeric, (v_p1_rating - v_p2_rating)::numeric / 400));

    v_p1_new_rating := greatest(round(v_p1_rating + (v_k_factor * (v_sa - v_ea)))::integer, 0);
    v_p2_new_rating := greatest(round(v_p2_rating + (v_k_factor * (v_sb - v_eb)))::integer, 0);

    update public.profiles p
    set rating = case
      when p.id = v_p1_user_id then v_p1_new_rating
      when p.id = v_p2_user_id then v_p2_new_rating
      else p.rating
    end
    where p.id in (v_p1_user_id, v_p2_user_id);
  end if;
end;
$$;

create or replace function public.fn_finish_arena(p_arena_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_arena_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Forbidden';
  end if;

  update public.arenas
  set status = 'finished', end_time = coalesce(end_time, now())
  where id = p_arena_id
    and status <> 'finished'
  returning id into v_updated_arena_id;

  if v_updated_arena_id is null then
    return;
  end if;

  perform public.fn_apply_arena_finish_side_effects(p_arena_id);
end;
$$;

create or replace function public.fn_submit_answer(
  p_arena_id uuid,
  p_question_id uuid,
  p_selected_option_id uuid,
  p_base_points integer default 1000,
  p_decay_rate numeric default 20
)
returns table(
  is_correct boolean,
  score_awarded integer,
  total_score integer,
  correct_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_arena_status public.arena_status;
  v_question_start timestamptz;
  v_question_no integer;
  v_response_seconds numeric(8,3);
  v_is_correct boolean;
  v_score integer;
  v_player_count integer;
  v_answered_count integer;
  v_next_question_id uuid;
  v_finished_arena_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select a.status into v_arena_status
  from public.arenas a
  where a.id = p_arena_id;

  if v_arena_status is null then
    raise exception 'Arena not found';
  end if;

  if v_arena_status <> 'active' then
    raise exception 'Arena is not active';
  end if;

  if not public.is_arena_participant(p_arena_id, v_user_id) then
    raise exception 'Forbidden';
  end if;

  select aq.question_start_time, aq.question_no
  into v_question_start, v_question_no
  from public.arena_questions aq
  where aq.arena_id = p_arena_id
    and aq.question_id = p_question_id;

  if v_question_start is null then
    raise exception 'Question is not part of this arena';
  end if;

  select qo.is_correct into v_is_correct
  from public.question_options qo
  where qo.id = p_selected_option_id
    and qo.question_id = p_question_id;

  if v_is_correct is null then
    raise exception 'Invalid answer option';
  end if;

  v_response_seconds := greatest(extract(epoch from (now() - v_question_start))::numeric, 0);

  if v_is_correct then
    v_score := greatest((p_base_points - floor(v_response_seconds * p_decay_rate))::integer, 0);
  else
    v_score := 0;
  end if;

  insert into public.answers(
    arena_id,
    question_id,
    user_id,
    selected_option_id,
    is_correct,
    response_seconds,
    score_awarded
  )
  values (
    p_arena_id,
    p_question_id,
    v_user_id,
    p_selected_option_id,
    v_is_correct,
    v_response_seconds,
    v_score
  )
  on conflict (arena_id, question_id, user_id) do nothing;

  if not found then
    raise exception 'You already answered this question';
  end if;

  update public.arena_players ap
  set
    total_score = ap.total_score + v_score,
    correct_count = ap.correct_count + case when v_is_correct then 1 else 0 end
  where ap.arena_id = p_arena_id
    and ap.user_id = v_user_id;

  select count(*)::integer
    into v_player_count
  from public.arena_players ap
  where ap.arena_id = p_arena_id;

  select count(*)::integer
    into v_answered_count
  from public.answers ans
  where ans.arena_id = p_arena_id
    and ans.question_id = p_question_id;

  if v_player_count > 0 and v_answered_count >= v_player_count then
    select aq.question_id
      into v_next_question_id
    from public.arena_questions aq
    where aq.arena_id = p_arena_id
      and aq.question_no = v_question_no + 1
    limit 1;

    if v_next_question_id is not null then
      update public.arena_questions aq
      set question_start_time = now()
      where aq.arena_id = p_arena_id
        and aq.question_id = v_next_question_id
        and aq.question_start_time > now();
    else
      update public.arenas
      set status = 'finished', end_time = coalesce(end_time, now())
      where id = p_arena_id
        and status <> 'finished'
      returning id into v_finished_arena_id;

      if v_finished_arena_id is not null then
        perform public.fn_apply_arena_finish_side_effects(p_arena_id);
      end if;
    end if;
  end if;

  return query
  select
    v_is_correct,
    v_score,
    ap.total_score,
    ap.correct_count
  from public.arena_players ap
  where ap.arena_id = p_arena_id
    and ap.user_id = v_user_id;
end;
$$;

commit;
