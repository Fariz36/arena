"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientToServerEvent, parseServerEvent } from "@/features/arena/lib/pvp-protocol";

type PvpQueueButtonProps = {
  userId: string;
  username: string;
};

const DEFAULT_WS_URL = "ws://localhost:8080";

export default function PvpQueueButton({ userId, username }: PvpQueueButtonProps) {
  const router = useRouter();
  const wsUrl = process.env.NEXT_PUBLIC_PVP_WS_URL ?? DEFAULT_WS_URL;
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
    };

    ws.onmessage = (event) => {
      const payload = parseServerEvent(String(event.data));
      if (!payload) {
        return;
      }

      if (payload.type === "QUEUE_WAITING") {
        setInQueue(true);
        setFeedback(`Queued. Waiting for opponent (queue: ${payload.queue_size}).`);
        return;
      }

      if (payload.type === "MATCH_FOUND") {
        setInQueue(false);
        setFeedback("Match found. Redirecting to arena...");
        router.push(`/arena/${payload.match_id}`);
        return;
      }

      if (payload.type === "ERROR") {
        setFeedback(payload.message);
        return;
      }

      if (payload.type === "MATCH_CANCELLED") {
        setInQueue(false);
        setFeedback(payload.reason);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setInQueue(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [authPayload, router, wsUrl]);

  function send(payload: ClientToServerEvent) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setFeedback("WebSocket is not connected.");
      return;
    }
    ws.send(JSON.stringify(payload));
  }

  function handleJoinQueue() {
    setFeedback(null);
    send({ type: "JOIN_QUEUE", mode: "classic" });
  }

  function handleLeaveQueue() {
    send({ type: "LEAVE_QUEUE" });
    setInQueue(false);
    setFeedback("You left the queue.");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
        <span className="text-slate-600"> Status : {isConnected ? "connected" : "disconnected"}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleJoinQueue}
          disabled={!isConnected || inQueue}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {inQueue ? "In Queue" : "Join Queue"}
        </button>
        <button
          type="button"
          onClick={handleLeaveQueue}
          disabled={!isConnected || !inQueue}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Leave Queue
        </button>
      </div>
      {feedback ? <p className="text-sm text-slate-600">{feedback}</p> : null}
    </div>
  );
}

