begin;

drop policy if exists "arena_players_select_participants_or_admin"
on public.arena_players;

create policy "arena_players_select_participants_or_admin"
on public.arena_players
for select
using (
  public.is_admin(auth.uid())
  or public.is_arena_participant(arena_id, auth.uid())
);

commit;
