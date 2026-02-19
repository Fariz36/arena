import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type QueueStatusRpcRow = {
  in_queue: boolean;
  queue_count: number;
  opponent_available: boolean;
  active_arena_id: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("fn_queue_status");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? (data[0] as QueueStatusRpcRow | undefined) : undefined;
  if (!row) {
    return NextResponse.json({ error: "Failed to read queue status." }, { status: 500 });
  }

  return NextResponse.json(row);
}
