import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  username: string;
  rating: number;
  total_matches: number;
  win_count: number;
  avg_score: number;
  created_at: string;
};

type RatingProgressionRow = {
  arena_id: string;
  end_time: string;
  rating_before: number;
  rating_after: number;
  rating_delta: number;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: profile, error: profileError }, { data: ratingRows, error: ratingError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, rating, total_matches, win_count, avg_score, created_at")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>(),
    supabase.rpc("fn_profile_rating_progression", { p_limit: 200 }).returns<RatingProgressionRow[]>(),
  ]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (ratingError) {
    return NextResponse.json({ error: ratingError.message }, { status: 400 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  return NextResponse.json({
    profile,
    rating_progression: ratingRows ?? [],
  });
}
