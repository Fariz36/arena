-- QuizArena MVP initial schema
-- Target: Supabase Postgres

begin;

create extension if not exists pgcrypto;

-- Enums
create type public.app_role as enum ('player', 'admin');
create type public.arena_status as enum ('waiting', 'active', 'finished');
create type public.question_difficulty as enum ('easy', 'medium', 'hard');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Core tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  role public.app_role not null default 'player',
  rating integer not null default 1200 check (rating >= 0),
  total_matches integer not null default 0 check (total_matches >= 0),
  win_count integer not null default 0 check (win_count >= 0),
  avg_score numeric(10,2) not null default 0 check (avg_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  question_text text not null,
  difficulty public.question_difficulty not null default 'easy',
  category text not null,
  time_limit_seconds integer not null default 20 check (time_limit_seconds between 5 and 120),
  image_url text,
  is_active boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  position smallint not null check (position between 1 and 5),
  created_at timestamptz not null default now(),
  unique (question_id, position)
);

create table public.match_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now()
);

create table public.arenas (
  id uuid primary key default gen_random_uuid(),
  status public.arena_status not null default 'waiting',
  start_time timestamptz,
  end_time timestamptz,
  question_count integer not null default 5 check (question_count > 0),
  created_at timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time >= start_time)
);

create table public.arena_players (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_score integer not null default 0 check (total_score >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  final_rank integer,
  joined_at timestamptz not null default now(),
  unique (arena_id, user_id)
);

create table public.arena_questions (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  question_no integer not null check (question_no > 0),
  question_start_time timestamptz not null,
  unique (arena_id, question_no),
  unique (arena_id, question_id)
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  selected_option_id uuid not null references public.question_options(id),
  is_correct boolean not null,
  response_seconds numeric(8,3) not null check (response_seconds >= 0),
  score_awarded integer not null check (score_awarded >= 0),
  submitted_at timestamptz not null default now(),
  unique (arena_id, question_id, user_id)
);

-- Constraints and indexes
create unique index uq_question_one_correct
  on public.question_options(question_id)
  where is_correct;

create index idx_questions_active on public.questions(is_active);
create index idx_questions_category on public.questions(category);
create index idx_questions_created_at on public.questions(created_at desc);

create index idx_queue_joined_at on public.match_queue(joined_at);

create index idx_arena_players_arena on public.arena_players(arena_id);
create index idx_arena_players_user on public.arena_players(user_id);

create index idx_arena_questions_arena_no on public.arena_questions(arena_id, question_no);

create index idx_answers_arena_user on public.answers(arena_id, user_id);
create index idx_answers_user_submitted_at on public.answers(user_id, submitted_at desc);

-- Utility functions (after dependent tables exist)
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'admin'
  );
$$;

create or replace function public.is_arena_participant(p_arena_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.arena_players ap
    where ap.arena_id = p_arena_id
      and ap.user_id = p_user_id
  );
$$;

-- Triggers
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger trg_questions_updated_at
before update on public.questions
for each row
execute function public.set_updated_at();

-- Ensure active questions are fully valid for gameplay
create or replace function public.validate_question_for_activation()
returns trigger
language plpgsql
as $$
declare
  option_count integer;
  correct_count integer;
begin
  if new.is_active then
    select count(*), count(*) filter (where is_correct)
      into option_count, correct_count
    from public.question_options
    where question_id = new.id;

    if option_count < 2 or option_count > 5 then
      raise exception 'Question % must have between 2 and 5 options', new.id;
    end if;

    if correct_count <> 1 then
      raise exception 'Question % must have exactly one correct option', new.id;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validate_question_for_activation
before insert or update of is_active
on public.questions
for each row
execute function public.validate_question_for_activation();

-- Auto profile creation for new auth users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1),
    'player'
  );

  insert into public.profiles (id, username, role)
  values (new.id, base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6), 'player')
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RPC: join queue
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

-- RPC: matchmaking for 1v1 (admin/system)
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
  selected_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Forbidden';
  end if;

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

-- RPC: submit answer with speed-based scoring
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
  v_response_seconds numeric(8,3);
  v_is_correct boolean;
  v_score integer;
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

  select aq.question_start_time into v_question_start
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

-- RPC: finish arena and assign ranks
create or replace function public.fn_finish_arena(p_arena_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Forbidden';
  end if;

  update public.arenas
  set status = 'finished', end_time = coalesce(end_time, now())
  where id = p_arena_id
    and status <> 'finished';

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
end;
$$;

-- Views
create or replace view public.arena_leaderboard_v
with (security_invoker = true) as
select
  ap.arena_id,
  ap.user_id,
  p.username,
  ap.total_score,
  ap.correct_count,
  rank() over (
    partition by ap.arena_id
    order by ap.total_score desc, ap.correct_count desc, ap.joined_at asc
  ) as rank
from public.arena_players ap
join public.profiles p on p.id = ap.user_id;

create or replace view public.player_match_history_v
with (security_invoker = true) as
select
  ap.user_id,
  a.id as arena_id,
  a.start_time,
  a.end_time,
  extract(epoch from (coalesce(a.end_time, now()) - coalesce(a.start_time, a.created_at)))::integer as duration_seconds,
  ap.total_score as final_score,
  ap.final_rank
from public.arena_players ap
join public.arenas a on a.id = ap.arena_id
where a.status = 'finished';

-- Storage for question images
insert into storage.buckets (id, name, public)
values ('problems', 'problems', true)
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.match_queue enable row level security;
alter table public.arenas enable row level security;
alter table public.arena_players enable row level security;
alter table public.arena_questions enable row level security;
alter table public.answers enable row level security;

-- Profiles policies
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (id = auth.uid() or public.is_admin(auth.uid()));

create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

-- Questions policies
create policy "questions_select_active_or_admin"
on public.questions
for select
using (is_active = true or public.is_admin(auth.uid()));

create policy "questions_admin_insert"
on public.questions
for insert
with check (public.is_admin(auth.uid()));

create policy "questions_admin_update"
on public.questions
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "questions_admin_delete"
on public.questions
for delete
using (public.is_admin(auth.uid()));

-- Question options policies
create policy "question_options_select_active_question_or_admin"
on public.question_options
for select
using (
  exists (
    select 1
    from public.questions q
    where q.id = question_options.question_id
      and (q.is_active = true or public.is_admin(auth.uid()))
  )
);

create policy "question_options_admin_write"
on public.question_options
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Queue policies
create policy "queue_select_own_or_admin"
on public.match_queue
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "queue_insert_own"
on public.match_queue
for insert
with check (user_id = auth.uid());

create policy "queue_delete_own_or_admin"
on public.match_queue
for delete
using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- Arenas policies
create policy "arenas_select_participant_or_admin"
on public.arenas
for select
using (public.is_arena_participant(id, auth.uid()) or public.is_admin(auth.uid()));

-- Arena players policies
create policy "arena_players_select_participants_or_admin"
on public.arena_players
for select
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.arena_players ap2
    where ap2.arena_id = arena_players.arena_id
      and ap2.user_id = auth.uid()
  )
);

-- Arena questions policies
create policy "arena_questions_select_participants_or_admin"
on public.arena_questions
for select
using (public.is_arena_participant(arena_id, auth.uid()) or public.is_admin(auth.uid()));

-- Answers policies
create policy "answers_select_owner_or_admin"
on public.answers
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "answers_insert_owner_active_arena"
on public.answers
for insert
with check (
  user_id = auth.uid()
  and public.is_arena_participant(arena_id, auth.uid())
  and exists (
    select 1
    from public.arenas a
    where a.id = answers.arena_id
      and a.status = 'active'
  )
);

-- Storage object policies
create policy "question_images_public_read"
on storage.objects
for select
using (bucket_id = 'problems');

create policy "question_images_admin_insert"
on storage.objects
for insert
with check (bucket_id = 'problems' and public.is_admin(auth.uid()));

create policy "question_images_admin_update"
on storage.objects
for update
using (bucket_id = 'problems' and public.is_admin(auth.uid()))
with check (bucket_id = 'problems' and public.is_admin(auth.uid()));

create policy "question_images_admin_delete"
on storage.objects
for delete
using (bucket_id = 'problems' and public.is_admin(auth.uid()));

commit;
