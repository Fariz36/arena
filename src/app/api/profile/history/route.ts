import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MatchHistoryRow = {
  arena_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  final_score: number;
  final_rank: number;
  rating_before: number | null;
  rating_after: number | null;
  rating_delta: number | null;
  avg_response_seconds: number;
  correct_count: number;
  wrong_count: number;
  total_count: number;
};

type RpcCastError = {
  Error: string;
};

function normalizeHistoryRows(data: MatchHistoryRow[] | RpcCastError | null): MatchHistoryRow[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  return data;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);
  const sortBy = String(searchParams.get("sortBy") ?? "end_time");
  const sortDir = String(searchParams.get("sortDir") ?? "desc");

  const { data, error } = await supabase
    .rpc("fn_profile_match_history", {
      p_page: Number.isFinite(page) ? page : 1,
      p_page_size: Number.isFinite(pageSize) ? pageSize : 10,
      p_sort_by: sortBy,
      p_sort_dir: sortDir,
    })
    .returns<MatchHistoryRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = normalizeHistoryRows(data as MatchHistoryRow[] | RpcCastError | null);
  const total = rows.length > 0 ? rows[0].total_count : 0;

  return NextResponse.json({ rows, total });
}
