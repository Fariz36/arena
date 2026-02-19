"use client";

import { useActionState } from "react";
import {
  checkQueueStatusAction,
  joinQueueAction,
  type QueueActionState,
} from "@/features/queue/actions";

type JoinQueueButtonProps = {
  initialInQueue: boolean;
};

const INITIAL_STATE: QueueActionState = {
  error: null,
  message: null,
  inQueue: false,
};

export default function JoinQueueButton({ initialInQueue }: JoinQueueButtonProps) {
  const [joinState, joinFormAction, joinPending] = useActionState(joinQueueAction, {
    ...INITIAL_STATE,
    inQueue: initialInQueue,
  });
  const [statusState, statusFormAction, statusPending] = useActionState(checkQueueStatusAction, {
    ...INITIAL_STATE,
    inQueue: initialInQueue,
  });

  const hasStatusResult = statusState.message !== null || statusState.error !== null;
  const hasJoinResult = joinState.message !== null || joinState.error !== null;
  const inQueue = hasStatusResult ? statusState.inQueue : hasJoinResult ? joinState.inQueue : initialInQueue;

  const error = statusState.error ?? joinState.error;
  const feedback = statusState.message ?? joinState.message;

  return (
    <div className="space-y-2">
      <form action={joinFormAction}>
        <button
          type="submit"
          disabled={joinPending || inQueue}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {inQueue ? "Already in Queue" : joinPending ? "Joining Queue..." : "Join Queue"}
        </button>
      </form>

      <form action={statusFormAction}>
        <button
          type="submit"
          disabled={statusPending}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
        >
          {statusPending ? "Checking..." : "Check Queue Status"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {feedback ? <p className="text-sm text-slate-600">{feedback}</p> : null}
      {inQueue ? <p className="text-sm text-amber-600">Waiting for opponent...</p> : null}
    </div>
  );
}
