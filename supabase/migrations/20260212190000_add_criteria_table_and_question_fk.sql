begin;

create table public.criteria (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_criteria_updated_at
before update on public.criteria
for each row
execute function public.set_updated_at();

alter table public.questions
add column criteria_id uuid references public.criteria(id);

-- Backfill criteria from existing questions.category values.
insert into public.criteria (name)
select distinct q.category
from public.questions q
where q.category is not null
  and q.category <> ''
on conflict (name) do nothing;

update public.questions q
set criteria_id = c.id
from public.criteria c
where c.name = q.category
  and q.criteria_id is null;

create index idx_criteria_name on public.criteria(name);
create index idx_questions_criteria_id on public.questions(criteria_id);

alter table public.criteria enable row level security;

create policy "criteria_select_active_or_admin"
on public.criteria
for select
using (is_active = true or public.is_admin(auth.uid()));

create policy "criteria_admin_insert"
on public.criteria
for insert
with check (public.is_admin(auth.uid()));

create policy "criteria_admin_update"
on public.criteria
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "criteria_admin_delete"
on public.criteria
for delete
using (public.is_admin(auth.uid()));

commit;
