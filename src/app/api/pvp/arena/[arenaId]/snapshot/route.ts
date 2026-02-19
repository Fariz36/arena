import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ArenaQuestionRow = {
  question_id: string;
  question_no: number;
  question_start_time: string;
  questions: {
    question_text: string;
    time_limit_seconds: number;
    question_options: Array<{
      id: string;
      option_text: string;
      position: number;
    }>;
  } | null;
};

type ArenaPlayerRow = {
  user_id: string;
  total_score: number;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ arenaId: string }> },
) {
  const { arenaId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: questionRows, error: questionsError }, { data: playerRows, error: playersError }, { data: arenaRow, error: arenaError }] = await Promise.all([
    supabase
      .from("arena_questions")
      .select("question_id, question_no, question_start_time, questions(question_text, time_limit_seconds, question_options(id, option_text, position))")
      .eq("arena_id", arenaId)
      .order("question_no", { ascending: true })
      .returns<ArenaQuestionRow[]>(),
    supabase
      .from("arena_players")
      .select("user_id, total_score")
      .eq("arena_id", arenaId)
      .returns<ArenaPlayerRow[]>(),
    supabase
      .from("arenas")
      .select("status")
      .eq("id", arenaId)
      .maybeSingle<{ status: "waiting" | "active" | "finished" }>(),
  ]);

  if (questionsError) {
    return NextResponse.json({ error: questionsError.message }, { status: 400 });
  }

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 400 });
  }

  if (arenaError) {
    return NextResponse.json({ error: arenaError.message }, { status: 400 });
  }

  const questions = (questionRows ?? [])
    .filter((row) => Boolean(row.questions))
    .map((row) => {
      const question = row.questions as NonNullable<ArenaQuestionRow["questions"]>;
      return {
        question_id: row.question_id,
        question_no: row.question_no,
        question_start_time: row.question_start_time,
        text: question.question_text,
        time_limit: question.time_limit_seconds,
        options: [...question.question_options]
          .sort((a, b) => a.position - b.position)
          .map((option) => ({ id: option.id, text: option.option_text })),
      };
    });

  const scores = Object.fromEntries((playerRows ?? []).map((row) => [row.user_id, row.total_score]));

  return NextResponse.json({
    questions,
    scores,
    arena_status: arenaRow?.status ?? null,
  });
}
