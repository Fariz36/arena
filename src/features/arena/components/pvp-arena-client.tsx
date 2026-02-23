"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PvpArenaClientProps = {
  matchId: string;
  userId: string;
  username: string;
};

type ArenaQuestion = {
  question_id: string;
  question_no: number;
  question_start_time: string;
  text: string;
  time_limit: number;
  image_url?: string | null;
  options: Array<{ id: string; text: string }>;
};

type SnapshotResponse = {
  questions: ArenaQuestion[];
  scores: Record<string, number>;
  arena_status: "waiting" | "active" | "finished" | null;
};

type MatchResultState = {
  winner: string | null;
  finalScores: Record<string, number>;
};

export default function PvpArenaClient({ matchId, userId, username }: PvpArenaClientProps) {
  void username;

  const timerIntervalRef = useRef<number | null>(null);
  const [connectionMode, setConnectionMode] = useState<"CONNECTING" | "REALTIME" | "POLLING">("CONNECTING");

  const [isConnected, setIsConnected] = useState(false);
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<ArenaQuestion | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Record<string, true>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResultState | null>(null);

  const refreshSnapshot = useCallback(async () => {
    const response = await fetch(`/api/pvp/arena/${matchId}/snapshot`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setFeedback(payload.error ?? "Failed to load arena snapshot.");
      setIsConnected(false);
      return;
    }

    const payload = (await response.json()) as SnapshotResponse;
    setIsConnected(true);
    setQuestions(payload.questions ?? []);
    setScores(payload.scores ?? {});

    if (payload.arena_status === "finished") {
      const finalScores = payload.scores ?? {};
      const participants = Object.keys(finalScores);
      const winner =
        participants.length < 2
          ? participants[0] ?? null
          : finalScores[participants[0]] === finalScores[participants[1]]
            ? null
            : finalScores[participants[0]] > finalScores[participants[1]]
              ? participants[0]
              : participants[1];

      setMatchResult({ winner, finalScores });
      setCurrentQuestion(null);
    }
  }, [matchId]);

  useEffect(() => {
    let isDisposed = false;
    const supabase = createClient();

    const run = async () => {
      if (isDisposed) {
        return;
      }
      await refreshSnapshot();
    };

    void run();

    const arenaChannel = supabase
      .channel(`arena-live-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answers", filter: `arena_id=eq.${matchId}` },
        () => {
          void run();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arena_players", filter: `arena_id=eq.${matchId}` },
        () => {
          void run();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arenas", filter: `id=eq.${matchId}` },
        () => {
          void run();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionMode("REALTIME");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionMode("POLLING");
        }
      });

    const fallbackIntervalId = window.setInterval(() => {
      void run();
    }, 10000);

    return () => {
      isDisposed = true;
      window.clearInterval(fallbackIntervalId);
      void supabase.removeChannel(arenaChannel);
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [matchId, refreshSnapshot]);

  useEffect(() => {
    if (questions.length === 0) {
      return;
    }

    const tick = () => {
      const nowMs = Date.now();
      const active = questions.find((question) => {
        const startMs = new Date(question.question_start_time).getTime();
        const endMs = startMs + question.time_limit * 1000;
        return nowMs >= startMs && nowMs < endMs;
      });

      if (!active) {
        const lastQuestion = questions[questions.length - 1];
        const finishedAt = new Date(lastQuestion.question_start_time).getTime() + lastQuestion.time_limit * 1000;
        if (nowMs >= finishedAt) {
          const participants = Object.keys(scores);
          const winner =
            participants.length < 2
              ? participants[0] ?? null
              : scores[participants[0]] === scores[participants[1]]
                ? null
                : scores[participants[0]] > scores[participants[1]]
                  ? participants[0]
                  : participants[1];

          setMatchResult({ winner, finalScores: scores });
          setCurrentQuestion(null);
          setRemainingMs(0);
          return;
        }

        setCurrentQuestion(null);
        setRemainingMs(0);
        return;
      }

      if (!currentQuestion || currentQuestion.question_id !== active.question_id) {
        setCurrentQuestion(active);
        setSelectedOptionId(null);
      }

      const deadlineMs = new Date(active.question_start_time).getTime() + active.time_limit * 1000;
      setRemainingMs(Math.max(deadlineMs - nowMs, 0));
    };

    tick();
    timerIntervalRef.current = window.setInterval(tick, 250);

    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [currentQuestion, questions, scores]);

  async function handleAnswer(optionId: string) {
    if (!currentQuestion) {
      return;
    }

    if (answeredQuestionIds[currentQuestion.question_id]) {
      return;
    }

    setSelectedOptionId(optionId);

    const response = await fetch(`/api/pvp/arena/${matchId}/answer`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId: currentQuestion.question_id,
        optionId,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setFeedback(payload.error ?? "Failed to submit answer.");
      return;
    }

    setAnsweredQuestionIds((prev) => ({ ...prev, [currentQuestion.question_id]: true }));
    setFeedback("Answer submitted.");
    await refreshSnapshot();
  }

  const myScore = scores[userId] ?? 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
        <p className="text-slate-700">Match: {matchId}</p>
        <p className="text-slate-700">
          {!isConnected
            ? "Disconnected"
            : connectionMode === "REALTIME"
              ? "Realtime active"
              : connectionMode === "CONNECTING"
                ? "Connecting..."
                : "Fallback polling"}
        </p>
      </div>

      {currentQuestion ? (
        <section className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium text-slate-900">
              Question {currentQuestion.question_no}/{questions.length}
            </p>
            <p className="font-semibold text-amber-700">Time left: {secondsLeft}s</p>
          </div>
          <p className="text-slate-900">{currentQuestion.text}</p>
          {currentQuestion.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentQuestion.image_url}
              alt={`Question ${currentQuestion.question_no} illustration`}
              className="max-h-80 w-full rounded-md border border-slate-200 object-contain"
              loading="lazy"
            />
          ) : null}
          <div className="grid gap-2">
            {currentQuestion.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  void handleAnswer(option.id);
                }}
                disabled={selectedOptionId !== null || remainingMs <= 0 || Boolean(answeredQuestionIds[currentQuestion.question_id])}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  selectedOptionId === option.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800"
                } disabled:opacity-60`}
              >
                {option.text}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
          Waiting for next question...
        </section>
      )}

      <section className="rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Score</h2>
        <p className="mt-1 text-sm text-slate-700">You: {myScore}</p>
      </section>

      {matchResult ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">Match finished</p>
          <p className="text-emerald-700">Winner: {matchResult.winner ?? "Draw"}</p>
          <p className="text-emerald-700">Your final score: {matchResult.finalScores[userId] ?? 0}</p>
        </section>
      ) : null}

      {feedback ? <p className="text-sm text-slate-600">{feedback}</p> : null}
    </div>
  );
}
