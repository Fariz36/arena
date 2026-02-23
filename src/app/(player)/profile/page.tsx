import { redirect } from "next/navigation";
import ProfilePageClient from "@/features/profile/components/profile-page-client";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ProfilePageClient email={user.email} />;
}
