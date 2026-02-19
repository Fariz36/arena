"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [connectionStatus, setConnectionStatus] = useState<"CONNECTING" | "POLLING">("CONNECTING");
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
    setConnectionStatus("POLLING");
    setInQueue(row.in_queue);
    setQueueCount(row.queue_count);

    if (row.active_arena_id) {
      setFeedback("Match found. Redirecting to arena...");
      router.replace(`/arena/${row.active_arena_id}`);
      router.refresh();
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

    const run = async () => {
      if (isDisposed) {
        return;
      }
      await refreshStatus();
    };

    void run();
    const intervalId = window.setInterval(() => {
      void run();
    }, 3000);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
    };
  }, [refreshStatus]);

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
      router.replace(`/arena/${payload.status.active_arena_id}`);
      router.refresh();
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

  const connectionLabel = connectionStatus === "CONNECTING" ? "connecting" : "server polling";
  const connectionDotClass = connectionStatus === "CONNECTING" ? "bg-amber-500" : "bg-slate-400";

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
