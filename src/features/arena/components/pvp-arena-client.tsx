"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClientToServerEvent, ServerQuestionPayload, parseServerEvent } from "@/features/arena/lib/pvp-protocol";

type PvpArenaClientProps = {
  matchId: string;
  userId: string;
  username: string;
};

const DEFAULT_WS_URL = "ws://localhost:8080";

type MatchResultState = {
  winner: string | null;
  finalScores: Record<string, number>;
};

export default function PvpArenaClient({ matchId, userId, username }: PvpArenaClientProps) {
  const wsUrl = process.env.NEXT_PUBLIC_PVP_WS_URL ?? DEFAULT_WS_URL;
  const wsRef = useRef<WebSocket | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [question, setQuestion] = useState<ServerQuestionPayload | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResultState | null>(null);

  const authPayload = useMemo<ClientToServerEvent>(
    () => ({ type: "AUTH", user_id: userId, name: username }),
    [userId, username],
  );

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify(authPayload));
      ws.send(JSON.stringify({ type: "RESUME_MATCH", match_id: matchId } satisfies ClientToServerEvent));
    };

    ws.onmessage = (event) => {
      const payload = parseServerEvent(String(event.data));
      if (!payload) {
        return;
      }

      if (payload.type === "MATCH_FOUND" && payload.match_id === matchId) {
        setCountdown(payload.countdown);
        return;
      }

      if (payload.type === "QUESTION" && payload.match_id === matchId) {
        setFeedback(null);
        setMatchResult(null);
        setQuestion(payload);
        setSelectedOptionId(null);
        setRemainingMs(Math.max(new Date(payload.deadline_at).getTime() - Date.now(), 0));
        return;
      }

      if (payload.type === "ROUND_RESULT" && payload.match_id === matchId) {
        setScores(payload.scores);
        setFeedback(`Round ended. Correct answer: ${payload.correct_answer}`);
        return;
      }

      if (payload.type === "MATCH_RESULT" && payload.match_id === matchId) {
        setQuestion(null);
        setScores(payload.final_scores);
        setMatchResult({ winner: payload.winner, finalScores: payload.final_scores });
        return;
      }

      if (payload.type === "MATCH_CANCELLED") {
        setQuestion(null);
        setFeedback(payload.reason);
        return;
      }

      if (payload.type === "ERROR") {
        setFeedback(payload.message);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      ws.close();
      wsRef.current = null;
    };
  }, [authPayload, matchId, wsUrl]);

  useEffect(() => {
    if (!question) {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    const deadline = new Date(question.deadline_at).getTime();
    const update = () => {
      setRemainingMs(Math.max(deadline - Date.now(), 0));
    };

    update();
    timerIntervalRef.current = window.setInterval(update, 250);

    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [question]);

  function send(payload: ClientToServerEvent) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setFeedback("Realtime connection is not open.");
      return;
    }
    ws.send(JSON.stringify(payload));
  }

  function handleAnswer(optionId: string) {
    if (!question || selectedOptionId) {
      return;
    }
    setSelectedOptionId(optionId);
    send({
      type: "ANSWER",
      match_id: matchId,
      question_id: question.question_id,
      selected_option: optionId,
    });
  }

  const myScore = scores[userId] ?? 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
        <p className="text-slate-700">Match: {matchId}</p>
        <p className="text-slate-700">{isConnected ? "Connected" : "Disconnected"}</p>
      </div>

      {countdown !== null ? <p className="text-sm text-slate-600">Match found. Countdown: {countdown}s</p> : null}

      {question ? (
        <section className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium text-slate-900">
              Question {question.question_no}/{question.total_questions}
            </p>
            <p className="font-semibold text-amber-700">Time left: {secondsLeft}s</p>
          </div>
          <p className="text-slate-900">{question.text}</p>
          <div className="grid gap-2">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleAnswer(option.id)}
                disabled={selectedOptionId !== null || remainingMs <= 0}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  selectedOptionId === option.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {option.text}
              </button>
            ))}
          </div>
        </section>
      ) : null}

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

