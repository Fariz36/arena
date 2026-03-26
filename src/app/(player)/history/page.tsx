import { redirect } from "next/navigation";
import HistoryPageClient from "@/features/history/components/history-page-client";
import { fetchProfileMatchHistory } from "@/features/history/services/get-profile-match-history";
import { normalizeHistoryQuery, type HistorySearchParams } from "@/features/history/types/match-history";
import { createClient } from "@/lib/supabase/server";

type HistoryPageProps = {
  searchParams: Promise<HistorySearchParams>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const query = normalizeHistoryQuery(params);
  const { rows, total } = await fetchProfileMatchHistory(supabase, query);

  return (
    <HistoryPageClient
      email={user.email}
      historyRows={rows}
      historyTotal={total}
      page={query.page}
      pageSize={query.pageSize}
      sortBy={query.sortBy}
      sortDir={query.sortDir}
    />
  );
}
