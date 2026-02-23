import { redirect } from "next/navigation";
import HistoryPageClient from "@/features/history/components/history-page-client";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <HistoryPageClient email={user.email} />;
}
