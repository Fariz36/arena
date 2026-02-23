"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  void userId;
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
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          realtimeActiveRef.current = false;
          setConnectionStatus("POLLING");
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
  const connectionDotClass =
    connectionStatus === "CONNECTING" ? "bg-amber-500" : connectionStatus === "REALTIME" ? "bg-emerald-500" : "bg-slate-400";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${connectionDotClass}`} />
        <span className="text-slate-600">Status: {connectionLabel}</span>
      </div>

      {queueCount !== null ? <p className="text-xs text-slate-500">Players in queue: {queueCount}</p> : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            void handleJoinQueue();
          }}
          disabled={loading || inQueue}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {inQueue ? "In Queue" : loading ? "Joining Queue..." : "Join Queue"}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleLeaveQueue();
          }}
          disabled={loading || !inQueue}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
        >
          Leave Queue
        </button>
      </div>

      {feedback ? <p className="text-sm text-slate-600">{feedback}</p> : null}
    </div>
  );
}
