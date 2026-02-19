import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type JoinQueueRpcRow = {
  joined: boolean;
  message: string;
};

type QueueStatusRpcRow = {
  in_queue: boolean;
  queue_count: number;
  opponent_available: boolean;
  active_arena_id: string | null;
};

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: joinData, error: joinError } = await supabase.rpc("fn_join_queue");
  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 400 });
  }

  const joinRow = Array.isArray(joinData) ? (joinData[0] as JoinQueueRpcRow | undefined) : undefined;
  if (!joinRow) {
    return NextResponse.json({ error: "Unexpected queue response." }, { status: 500 });
  }

  const { count: activeQuestionCount, error: countError } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 });
  }

  const questionCount = Math.min(activeQuestionCount ?? 0, 5);
  if (questionCount < 1) {
    return NextResponse.json({ error: "No active questions available. Activate at least one question." }, { status: 400 });
  }

  const { error: matchmakeError } = await supabase.rpc("fn_matchmake_1v1_public", {
    p_question_count: questionCount,
  });

  if (matchmakeError) {
    return NextResponse.json({ error: matchmakeError.message }, { status: 400 });
  }

  const { data: statusData, error: statusError } = await supabase.rpc("fn_queue_status");
  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 400 });
  }

  const statusRow = Array.isArray(statusData) ? (statusData[0] as QueueStatusRpcRow | undefined) : undefined;
  if (!statusRow) {
    return NextResponse.json({ error: "Failed to read queue status." }, { status: 500 });
  }

  return NextResponse.json({ message: joinRow.message, status: statusRow });
}
