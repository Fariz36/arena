"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/client";

type PvpQueueButtonProps = {
  userId: string;
  username: string;
};

type QueueStatus = {
  in_queue: boolean;
  queue_count: number;
  opponent_available: boolean;
  active_arena_id: string | null;
};

type JoinQueueResponse = {
  message: string;
  status: QueueStatus;
};

export default function PvpQueueButton({ userId, username }: PvpQueueButtonProps) {
  void username;

  const router = useRouter();
  const realtimeActiveRef = useRef(false);
  const redirectingRef = useRef(false);
  const channelKeyRef = useRef(crypto.randomUUID());
  const [connectionStatus, setConnectionStatus] = useState<"CONNECTING" | "REALTIME" | "POLLING">("CONNECTING");
  const [inQueue, setInQueue] = useState(false);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const response = await fetch("/api/pvp/queue/status", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setFeedback(payload.error ?? "Failed to read queue status.");
      setConnectionStatus("POLLING");
      return;
    }

    const row = (await response.json()) as QueueStatus;
    setInQueue(row.in_queue);
    setQueueCount(row.queue_count);

    if (row.active_arena_id) {
      if (!redirectingRef.current) {
        redirectingRef.current = true;
        const targetPath = `/arena/${row.active_arena_id}`;
        router.replace(targetPath);
        window.setTimeout(() => {
          if (window.location.pathname !== targetPath) {
            window.location.assign(targetPath);
          }
        }, 800);
      }
      setFeedback("Match found. Redirecting to arena...");
      return;
    }

    if (row.in_queue) {
      setFeedback(row.opponent_available ? "Opponent available. Starting soon..." : "Queued. Waiting for opponent.");
    } else {
      setFeedback(null);
    }
  }, [router]);

  useEffect(() => {
    let isDisposed = false;
    const supabase = createClient();

    const run = async () => {
      if (isDisposed) {
        return;
      }
      await refreshStatus();
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
    let queueChannel:
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
        setConnectionStatus("POLLING");
        setRealtimeError(error instanceof Error ? error.message : "Failed to initialize realtime.");
        return;
      }
      if (isDisposed) {
        return;
      }

      queueChannel = supabase
        .channel(`queue-status-${userId}-${channelKeyRef.current}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "match_queue" },
          () => {
            void run();
          },
        )
        .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          realtimeActiveRef.current = true;
          setConnectionStatus("REALTIME");
          setRealtimeError(null);
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          realtimeActiveRef.current = false;
          setConnectionStatus("POLLING");
          setRealtimeError(`channel status: ${status}`);
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
      if (queueChannel) {
        void supabase.removeChannel(queueChannel);
      }
    };
  }, [refreshStatus, userId]);

  async function handleJoinQueue() {
    setLoading(true);
    setFeedback(null);

    const response = await fetch("/api/pvp/queue/join", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setFeedback(payload.error ?? "Failed to join queue.");
      return;
    }

    const payload = (await response.json()) as JoinQueueResponse;
    setInQueue(payload.status.in_queue);
    setQueueCount(payload.status.queue_count);
    setFeedback(payload.message || "Queued. Waiting for opponent.");

    if (payload.status.active_arena_id) {
      if (!redirectingRef.current) {
        redirectingRef.current = true;
        const targetPath = `/arena/${payload.status.active_arena_id}`;
        router.replace(targetPath);
        window.setTimeout(() => {
          if (window.location.pathname !== targetPath) {
            window.location.assign(targetPath);
          }
        }, 800);
      }
      return;
    }

    await refreshStatus();
  }

  async function handleLeaveQueue() {
    setLoading(true);
    setFeedback(null);

    const response = await fetch("/api/pvp/queue/leave", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setFeedback(payload.error ?? "Failed to leave queue.");
      return;
    }

    setInQueue(false);
    setFeedback("You left the queue.");
    await refreshStatus();
  }

  const connectionLabel =
    connectionStatus === "CONNECTING"
      ? "connecting"
      : connectionStatus === "REALTIME"
        ? "realtime"
        : "server polling";
  const connectionColor = connectionStatus === "REALTIME" ? "success" : connectionStatus === "CONNECTING" ? "warning" : "default";

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.56)", fontWeight: 600 }}>
          Status:
        </Typography>
        <Chip
          size="small"
          color={connectionColor}
          label={connectionLabel}
          sx={{
            height: 22,
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        />
      </Stack>

      {queueCount !== null ? (
        <Box
          sx={{
            display: "inline-flex",
            width: "fit-content",
            px: 1.1,
            py: 0.45,
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.11)",
            bgcolor: "rgba(255,255,255,0.04)",
          }}
        >
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.74)", fontWeight: 600 }}>
            Players in queue: {queueCount}
          </Typography>
        </Box>
      ) : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button
          type="button"
          onClick={() => {
            void handleJoinQueue();
          }}
          disabled={loading || inQueue}
          variant="contained"
          sx={{
            textTransform: "none",
            borderRadius: "10px",
            fontWeight: 700,
            px: 1.75,
            background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
            boxShadow: "0 8px 18px rgba(79,70,229,0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)",
            },
            "&.Mui-disabled": {
              color: "rgba(255,255,255,0.55)",
              background: "rgba(255,255,255,0.16)",
            },
          }}
        >
          {inQueue ? "In Queue" : loading ? "Joining Queue..." : "Join Queue"}
        </Button>
        <Button
          type="button"
          onClick={() => {
            void handleLeaveQueue();
          }}
          disabled={loading || !inQueue}
          variant="outlined"
          sx={{
            textTransform: "none",
            borderRadius: "10px",
            fontWeight: 700,
            px: 1.75,
            color: "rgba(255,255,255,0.82)",
            borderColor: "rgba(255,255,255,0.25)",
            "&:hover": {
              borderColor: "rgba(248,113,113,0.48)",
              color: "#fca5a5",
              bgcolor: "rgba(239,68,68,0.12)",
            },
            "&.Mui-disabled": {
              color: "rgba(255,255,255,0.35)",
              borderColor: "rgba(255,255,255,0.16)",
            },
          }}
        >
          Leave Queue
        </Button>
      </Stack>

      {feedback ? (
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
          {feedback}
        </Typography>
      ) : null}
      {realtimeError ? (
        <Alert
          severity="warning"
          sx={{
            borderRadius: "10px",
            border: "1px solid rgba(251,191,36,0.32)",
            bgcolor: "rgba(251,191,36,0.09)",
            color: "#fde68a",
            "& .MuiAlert-icon": { color: "#fbbf24" },
          }}
        >
          Realtime unavailable: {realtimeError}
        </Alert>
      ) : null}
    </Stack>
  );
}
