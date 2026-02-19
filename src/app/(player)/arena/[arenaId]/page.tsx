import { redirect } from "next/navigation";
import PvpArenaClient from "@/features/arena/components/pvp-arena-client";
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
    <main className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Arena {arenaId}</h1>
      <PvpArenaClient matchId={arenaId} userId={user.id} username={profile?.username ?? "player"} />
    </main>
  );
}
