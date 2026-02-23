import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AnalyticsRow = {
  total_answers: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy_pct: number;
  avg_response_seconds: number;
  category_breakdown: unknown;
  difficulty_breakdown: unknown;
};

type RpcCastError = {
  Error: string;
};

function normalizeAnalyticsRow(data: AnalyticsRow | AnalyticsRow[] | RpcCastError | null): AnalyticsRow | null {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  if ("Error" in data) {
    return null;
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
  const category = String(searchParams.get("category") ?? "").trim();

  const [{ data: analyticsData, error: analyticsError }, { data: allCategoryData, error: allCategoryError }] = await Promise.all([
    supabase
      .rpc("fn_profile_analytics", {
        p_category: category || null,
      })
      .returns<AnalyticsRow[]>(),
    supabase
      .rpc("fn_profile_analytics", {
        p_category: null,
      })
      .returns<AnalyticsRow[]>(),
  ]);

  if (analyticsError) {
    return NextResponse.json({ error: analyticsError.message }, { status: 400 });
  }

  if (allCategoryError) {
    return NextResponse.json({ error: allCategoryError.message }, { status: 400 });
  }

  const row = normalizeAnalyticsRow(analyticsData as AnalyticsRow | AnalyticsRow[] | RpcCastError | null);
  const allCategoryRow = normalizeAnalyticsRow(allCategoryData as AnalyticsRow | AnalyticsRow[] | RpcCastError | null);

  const allCategories = Array.isArray(allCategoryRow?.category_breakdown)
    ? (allCategoryRow.category_breakdown as Array<{ category?: string }>)
        .map((item) => String(item.category ?? "").trim())
        .filter((value) => value.length > 0)
    : [];

  return NextResponse.json({
    analytics: row,
    categories: allCategories,
  });
}
