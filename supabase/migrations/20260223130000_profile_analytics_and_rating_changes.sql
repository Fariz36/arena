begin;

create table if not exists public.arena_rating_changes (
  arena_id uuid not null references public.arenas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating_before integer not null check (rating_before >= 0),
  rating_after integer not null check (rating_after >= 0),
  rating_delta integer not null,
  created_at timestamptz not null default now(),
  primary key (arena_id, user_id)
);

create index if not exists idx_arena_rating_changes_user_created
  on public.arena_rating_changes(user_id, created_at desc);

alter table public.arena_rating_changes enable row level security;

create policy "arena_rating_changes_select_owner_or_admin"
on public.arena_rating_changes
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

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

    insert into public.arena_rating_changes(arena_id, user_id, rating_before, rating_after, rating_delta)
    values
      (p_arena_id, v_p1_user_id, v_p1_rating, v_p1_new_rating, v_p1_new_rating - v_p1_rating),
      (p_arena_id, v_p2_user_id, v_p2_rating, v_p2_new_rating, v_p2_new_rating - v_p2_rating)
    on conflict (arena_id, user_id) do nothing;
  end if;
end;
$$;

create or replace function public.fn_profile_match_history(
  p_page integer default 1,
  p_page_size integer default 10,
  p_sort_by text default 'end_time',
  p_sort_dir text default 'desc'
)
returns table(
  arena_id uuid,
  start_time timestamptz,
  end_time timestamptz,
  duration_seconds integer,
  final_score integer,
  final_rank integer,
  rating_before integer,
  rating_after integer,
  rating_delta integer,
  avg_response_seconds numeric,
  correct_count integer,
  wrong_count integer,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 10), 1), 100);
  v_offset integer := (v_page - 1) * v_page_size;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  return query
  with base as (
    select
      ap.arena_id,
      a.start_time,
      a.end_time,
      extract(epoch from (coalesce(a.end_time, now()) - coalesce(a.start_time, a.created_at)))::integer as duration_seconds,
      ap.total_score as final_score,
      ap.final_rank,
      rc.rating_before,
      rc.rating_after,
      rc.rating_delta,
      coalesce(avg(ans.response_seconds), 0)::numeric(10,3) as avg_response_seconds,
      coalesce(sum(case when ans.is_correct then 1 else 0 end), 0)::integer as correct_count,
      coalesce(sum(case when ans.is_correct then 0 else 1 end), 0)::integer as wrong_count
    from public.arena_players ap
    join public.arenas a on a.id = ap.arena_id
    left join public.arena_rating_changes rc
      on rc.arena_id = ap.arena_id
     and rc.user_id = ap.user_id
    left join public.answers ans
      on ans.arena_id = ap.arena_id
     and ans.user_id = ap.user_id
    where ap.user_id = v_user_id
      and a.status = 'finished'
    group by
      ap.arena_id,
      a.start_time,
      a.end_time,
      a.created_at,
      ap.total_score,
      ap.final_rank,
      rc.rating_before,
      rc.rating_after,
      rc.rating_delta
  ), counted as (
    select b.*, count(*) over() as total_count
    from base b
  )
  select
    c.arena_id,
    c.start_time,
    c.end_time,
    c.duration_seconds,
    c.final_score,
    c.final_rank,
    c.rating_before,
    c.rating_after,
    c.rating_delta,
    c.avg_response_seconds,
    c.correct_count,
    c.wrong_count,
    c.total_count
  from counted c
  order by
    case when lower(p_sort_by) = 'end_time' and lower(p_sort_dir) = 'asc' then c.end_time end asc nulls last,
    case when lower(p_sort_by) = 'end_time' and lower(p_sort_dir) <> 'asc' then c.end_time end desc nulls last,
    case when lower(p_sort_by) = 'final_score' and lower(p_sort_dir) = 'asc' then c.final_score end asc,
    case when lower(p_sort_by) = 'final_score' and lower(p_sort_dir) <> 'asc' then c.final_score end desc,
    case when lower(p_sort_by) = 'final_rank' and lower(p_sort_dir) = 'asc' then c.final_rank end asc,
    case when lower(p_sort_by) = 'final_rank' and lower(p_sort_dir) <> 'asc' then c.final_rank end desc,
    case when lower(p_sort_by) = 'rating_delta' and lower(p_sort_dir) = 'asc' then c.rating_delta end asc,
    case when lower(p_sort_by) = 'rating_delta' and lower(p_sort_dir) <> 'asc' then c.rating_delta end desc,
    c.end_time desc nulls last
  offset v_offset
  limit v_page_size;
end;
$$;

grant execute on function public.fn_profile_match_history(integer, integer, text, text) to authenticated;

create or replace function public.fn_profile_rating_progression(p_limit integer default 50)
returns table(
  arena_id uuid,
  end_time timestamptz,
  rating_before integer,
  rating_after integer,
  rating_delta integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    rc.arena_id,
    a.end_time,
    rc.rating_before,
    rc.rating_after,
    rc.rating_delta
  from public.arena_rating_changes rc
  join public.arenas a on a.id = rc.arena_id
  where rc.user_id = v_user_id
    and a.status = 'finished'
  order by a.end_time asc nulls last
  limit v_limit;
end;
$$;

grant execute on function public.fn_profile_rating_progression(integer) to authenticated;

create or replace function public.fn_profile_analytics(p_category text default null)
returns table(
  total_answers integer,
  correct_answers integer,
  wrong_answers integer,
  accuracy_pct numeric,
  avg_response_seconds numeric,
  category_breakdown jsonb,
  difficulty_breakdown jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_category text := nullif(trim(coalesce(p_category, '')), '');
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  return query
  with filtered as (
    select
      ans.is_correct,
      ans.response_seconds,
      q.category,
      q.difficulty
    from public.answers ans
    join public.questions q on q.id = ans.question_id
    where ans.user_id = v_user_id
      and (v_category is null or q.category = v_category)
  ),
  totals as (
    select
      count(*)::integer as total_answers,
      coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer as correct_answers,
      coalesce(sum(case when is_correct then 0 else 1 end), 0)::integer as wrong_answers,
      coalesce(avg(response_seconds), 0)::numeric(10,3) as avg_response_seconds
    from filtered
  ),
  by_category as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'category', x.category,
      'total', x.total_count,
      'correct', x.correct_count,
      'wrong', x.wrong_count,
      'accuracy_pct', x.accuracy_pct
    ) order by x.category), '[]'::jsonb) as payload
    from (
      select
        f.category,
        count(*)::integer as total_count,
        sum(case when f.is_correct then 1 else 0 end)::integer as correct_count,
        sum(case when f.is_correct then 0 else 1 end)::integer as wrong_count,
        round((sum(case when f.is_correct then 1 else 0 end)::numeric / nullif(count(*), 0)) * 100, 2) as accuracy_pct
      from filtered f
      group by f.category
    ) x
  ),
  by_difficulty as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'difficulty', x.difficulty,
      'total', x.total_count,
      'correct', x.correct_count,
      'wrong', x.wrong_count,
      'accuracy_pct', x.accuracy_pct,
      'avg_response_seconds', x.avg_response_seconds
    ) order by x.difficulty), '[]'::jsonb) as payload
    from (
      select
        f.difficulty,
        count(*)::integer as total_count,
        sum(case when f.is_correct then 1 else 0 end)::integer as correct_count,
        sum(case when f.is_correct then 0 else 1 end)::integer as wrong_count,
        round((sum(case when f.is_correct then 1 else 0 end)::numeric / nullif(count(*), 0)) * 100, 2) as accuracy_pct,
        round(avg(f.response_seconds)::numeric, 3) as avg_response_seconds
      from filtered f
      group by f.difficulty
    ) x
  )
  select
    t.total_answers,
    t.correct_answers,
    t.wrong_answers,
    round((t.correct_answers::numeric / nullif(t.total_answers, 0)) * 100, 2) as accuracy_pct,
    t.avg_response_seconds,
    c.payload,
    d.payload
  from totals t
  cross join by_category c
  cross join by_difficulty d;
end;
$$;

grant execute on function public.fn_profile_analytics(text) to authenticated;

commit;
