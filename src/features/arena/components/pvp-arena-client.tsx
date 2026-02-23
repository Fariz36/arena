"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
  rating_change: {
    before: number;
    after: number;
    delta: number;
  } | null;
};

type MatchResultState = {
  winner: string | null;
  finalScores: Record<string, number>;
  ratingChange: {
    before: number;
    after: number;
    delta: number;
  } | null;
};

export default function PvpArenaClient({ matchId, userId, username }: PvpArenaClientProps) {
  void username;

  const timerIntervalRef = useRef<number | null>(null);
  const realtimeActiveRef = useRef(false);
  const channelKeyRef = useRef(crypto.randomUUID());
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
  const [resultModalOpen, setResultModalOpen] = useState(false);

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

      setMatchResult({
        winner,
        finalScores,
        ratingChange: payload.rating_change ?? null,
      });
      setResultModalOpen(true);
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

    const setupRealtimeAuth = async () => {
      const response = await fetch("/api/pvp/realtime/token", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to initialize realtime auth.");
      }

      const payload = (await response.json()) as { access_token?: string };
      const accessToken = String(payload.access_token ?? "");
      if (!accessToken) {
        throw new Error("Missing realtime access token.");
      }

      supabase.realtime.setAuth(accessToken);
    };

    void run();
    let arenaChannel:
      | ReturnType<ReturnType<typeof createClient>["channel"]>
      | null = null;

    const initRealtime = async () => {
      try {
        await setupRealtimeAuth();
      } catch (error) {
        if (isDisposed) {
          return;
        }
        realtimeActiveRef.current = false;
        setConnectionMode("POLLING");
        setFeedback(error instanceof Error ? error.message : "Failed to initialize realtime.");
        return;
      }
      if (isDisposed) {
        return;
      }

      arenaChannel = supabase
        .channel(`arena-live-${matchId}-${channelKeyRef.current}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "answers", filter: `arena_id=eq.${matchId}` },
          () => {
            void run();
          },
        )
        .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          realtimeActiveRef.current = true;
          setConnectionMode("REALTIME");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          realtimeActiveRef.current = false;
          setConnectionMode("POLLING");
          void error;
        }
      });
    };

    void initRealtime();

    const fallbackIntervalId = window.setInterval(() => {
      if (!realtimeActiveRef.current) {
        void run();
      }
    }, 10000);

    return () => {
      isDisposed = true;
      window.clearInterval(fallbackIntervalId);
      if (arenaChannel) {
        void supabase.removeChannel(arenaChannel);
      }
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
      const startedQuestions = questions
        .filter((question) => nowMs >= new Date(question.question_start_time).getTime())
        .sort((a, b) => b.question_no - a.question_no);

      const active = startedQuestions.find((question) => {
        const startMs = new Date(question.question_start_time).getTime();
        const endMs = startMs + question.time_limit * 1000;
        return nowMs < endMs;
      });

      if (!active) {
        const lastQuestion = questions[questions.length - 1];
        const finishedAt = new Date(lastQuestion.question_start_time).getTime() + lastQuestion.time_limit * 1000;
        if (nowMs >= finishedAt) {
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
  const didWin = matchResult?.winner === userId;
  const isDraw = matchResult?.winner === null;
  const connectionLabelText =
    !isConnected ? "Disconnected" : connectionMode === "REALTIME" ? "Realtime active" : connectionMode === "CONNECTING" ? "Connecting..." : "Fallback polling";
  const connectionChipColor = !isConnected ? "error" : connectionMode === "REALTIME" ? "success" : connectionMode === "CONNECTING" ? "warning" : "default";

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Match: {matchId}
          </Typography>
          <Chip size="small" color={connectionChipColor} label={connectionLabelText} sx={{ width: "fit-content" }} />
        </Stack>
      </Paper>

      {currentQuestion ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">
                Question {currentQuestion.question_no}/{questions.length}
              </Typography>
              <Typography variant="body2" color="warning.main" fontWeight={600}>
                Time left: {secondsLeft}s
              </Typography>
            </Stack>
          <Typography variant="body1">{currentQuestion.text}</Typography>
          {currentQuestion.image_url ? (
            <Box
              component="img"
              src={currentQuestion.image_url}
              alt={`Question ${currentQuestion.question_no} illustration`}
              loading="lazy"
              sx={{
                maxHeight: 320,
                width: "100%",
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
                objectFit: "contain",
              }}
            />
          ) : null}
          <Stack spacing={1}>
            {currentQuestion.options.map((option) => (
              <Button
                key={option.id}
                type="button"
                onClick={() => {
                  void handleAnswer(option.id);
                }}
                disabled={selectedOptionId !== null || remainingMs <= 0 || Boolean(answeredQuestionIds[currentQuestion.question_id])}
                variant={selectedOptionId === option.id ? "contained" : "outlined"}
                color={selectedOptionId === option.id ? "primary" : "inherit"}
                sx={{ justifyContent: "flex-start", textTransform: "none" }}
              >
                {option.text}
              </Button>
            ))}
          </Stack>
          </Stack>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Waiting for next question...
          </Typography>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="subtitle2">Score</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          You: {myScore}
        </Typography>
      </Paper>

      {matchResult ? (
        <Alert severity="success">
          <Typography variant="subtitle2">Match finished</Typography>
          <Typography variant="body2">Winner: {matchResult.winner ?? "Draw"}</Typography>
          <Typography variant="body2">Your final score: {matchResult.finalScores[userId] ?? 0}</Typography>
        </Alert>
      ) : null}

      {feedback ? (
        <Typography variant="body2" color="text.secondary">
          {feedback}
        </Typography>
      ) : null}

      {resultModalOpen && matchResult ? (
        <Dialog open={resultModalOpen} onClose={() => setResultModalOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>{isDraw ? "Match Draw" : didWin ? "Match Win" : "Match Lose"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Final score: {matchResult.finalScores[userId] ?? 0}
              </Typography>
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
              {matchResult.ratingChange ? (
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    Rating change:{" "}
                    <Box component="span" sx={{ fontWeight: 700, color: matchResult.ratingChange.delta >= 0 ? "success.main" : "error.main" }}>
                      {matchResult.ratingChange.delta >= 0 ? "+" : ""}
                      {matchResult.ratingChange.delta}
                    </Box>
                  </Typography>
                  <Typography variant="body2">Rating after: {matchResult.ratingChange.after}</Typography>
                </Stack>
              ) : (
                <Typography variant="body2">Rating update is processing.</Typography>
              )}
              </Paper>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResultModalOpen(false)} variant="contained">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Stack>
  );
}
