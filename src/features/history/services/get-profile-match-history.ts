import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { HistoryQuery, MatchHistoryRow } from "@/features/history/types/match-history";

type HistoryRpcRow = MatchHistoryRow & {
  total_count: number;
};

type RpcCastError = {
  Error: string;
};

function normalizeHistoryRows(data: HistoryRpcRow[] | RpcCastError | null): HistoryRpcRow[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data;
}

export async function fetchProfileMatchHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: HistoryQuery,
) {
  const { data, error } = await supabase
    .rpc("fn_profile_match_history", {
      p_page: query.page,
      p_page_size: query.pageSize,
      p_sort_by: query.sortBy,
      p_sort_dir: query.sortDir,
    })
    .returns<HistoryRpcRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const rows = normalizeHistoryRows(data as HistoryRpcRow[] | RpcCastError | null);

  return {
    rows: rows.map((row) => {
      const { total_count, ...historyRow } = row;
      void total_count;
      return historyRow;
    }),
    total: rows.length > 0 ? rows[0].total_count : 0,
  };
}
