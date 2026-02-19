begin;

create or replace function public.fn_queue_status()
returns table(
  in_queue boolean,
  queue_count integer,
  opponent_available boolean,
  active_arena_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  return query
  with my_queue as (
    select exists(
      select 1
      from public.match_queue mq
      where mq.user_id = v_user_id
    ) as in_queue
  ),
  queue_stats as (
    select count(*)::integer as queue_count
    from public.match_queue
  ),
  active_arena as (
    select ap.arena_id
    from public.arena_players ap
    join public.arenas a on a.id = ap.arena_id
    where ap.user_id = v_user_id
      and a.status = 'active'
    order by a.start_time desc nulls last
    limit 1
  )
  select
    mq.in_queue,
    qs.queue_count,
    (mq.in_queue and qs.queue_count > 1) as opponent_available,
    aa.arena_id as active_arena_id
  from my_queue mq
  cross join queue_stats qs
  left join active_arena aa on true;
end;
$$;

commit;
