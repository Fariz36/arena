import AppNavigationView from "@/components/navigation/app-navigation-view";
import { createClient } from "@/lib/supabase/server";

type ProfileRoleRow = {
  role: "player" | "admin";
};

export default async function AppNavigation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<ProfileRoleRow>();

  return <AppNavigationView isAdmin={profile?.role === "admin"} />;
}
