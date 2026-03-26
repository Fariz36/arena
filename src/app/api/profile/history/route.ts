import { NextResponse } from "next/server";
import { fetchProfileMatchHistory } from "@/features/history/services/get-profile-match-history";
import { normalizeHistoryQuery } from "@/features/history/types/match-history";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = normalizeHistoryQuery({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortDir: searchParams.get("sortDir") ?? undefined,
  });

  try {
    const result = await fetchProfileMatchHistory(supabase, query);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
