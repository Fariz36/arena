import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ access_token: session.access_token });
}
