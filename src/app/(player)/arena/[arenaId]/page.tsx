import { redirect } from "next/navigation";
import Stack from "@mui/material/Stack";
import PvpArenaClient from "@/features/arena/components/pvp-arena-client";
import { AppPageCard, AppPageHeading } from "@/components/ui/page-shell";
import { createClient } from "@/lib/supabase/server";

type ArenaPageProps = {
  params: Promise<{ arenaId: string }>;
};

export default async function ArenaPage({ params }: ArenaPageProps) {
  const { arenaId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle<{ username: string }>();

  return (
    <AppPageCard>
      <Stack spacing={3}>
      <AppPageHeading title={`Arena ${arenaId}`} />
      <PvpArenaClient matchId={arenaId} userId={user.id} username={profile?.username ?? "player"} />
      </Stack>
    </AppPageCard>
  );
}
