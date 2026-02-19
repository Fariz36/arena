import { redirect } from "next/navigation";
import DashboardView from "@/features/dashboard/components/dashboard-view";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  username: string;
  rating: number;
  total_matches: number;
  win_count: number;
  avg_score: number;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, rating, total_matches, win_count, avg_score")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const stats = [
    { label: "Username", value: profile?.username ?? "-" },
    { label: "Rating", value: profile?.rating ?? 1200 },
    { label: "Total Matches", value: profile?.total_matches ?? 0 },
    { label: "Wins", value: profile?.win_count ?? 0 },
    { label: "Average Score", value: profile?.avg_score ?? 0 },
  ];

  return (
    <DashboardView
      email={user.email}
      userId={user.id}
      username={profile?.username ?? "player"}
      stats={stats}
    />
  );
}
