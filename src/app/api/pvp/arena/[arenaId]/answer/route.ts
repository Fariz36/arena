import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AnswerPayload = {
  questionId?: string;
  optionId?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ arenaId: string }> },
) {
  const { arenaId } = await context.params;

  const payload = (await request.json().catch(() => ({}))) as AnswerPayload;
  const questionId = String(payload.questionId ?? "").trim();
  const optionId = String(payload.optionId ?? "").trim();

  if (!questionId || !optionId) {
    return NextResponse.json({ error: "questionId and optionId are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.rpc("fn_submit_answer", {
    p_arena_id: arenaId,
    p_question_id: questionId,
    p_selected_option_id: optionId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
