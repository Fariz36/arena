"use server";

import { createClient } from "@/lib/supabase/server";

export type QueueActionState = {
  error: string | null;
  message: string | null;
  inQueue: boolean;
};

type JoinQueueRpcRow = {
  joined: boolean;
  message: string;
};

type QueueStatusRpcRow = {
  in_queue: boolean;
  queue_count: number;
  opponent_available: boolean;
  active_arena_id: string | null;
};

export async function joinQueueAction(
  prevState: QueueActionState,
  formData: FormData,
): Promise<QueueActionState> {
  void prevState;
  void formData;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("fn_join_queue");

  if (error) {
    return {
      error: error.message,
      message: null,
      inQueue: false,
    };
  }

  const row = Array.isArray(data) ? (data[0] as JoinQueueRpcRow | undefined) : undefined;
  if (!row) {
    return {
      error: "Unexpected queue response.",
      message: null,
      inQueue: false,
    };
  }

  return {
    error: null,
    message: row.message,
    inQueue: row.joined,
  };
}

export async function checkQueueStatusAction(
  prevState: QueueActionState,
  formData: FormData,
): Promise<QueueActionState> {
  void prevState;
  void formData;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("fn_queue_status");

  if (error) {
    return {
      error: error.message,
      message: null,
      inQueue: false,
    };
  }

  const row = Array.isArray(data) ? (data[0] as QueueStatusRpcRow | undefined) : undefined;
  if (!row) {
    return {
      error: "Failed to read queue status.",
      message: null,
      inQueue: false,
    };
  }

  if (row.active_arena_id) {
    return {
      error: null,
      message: `Opponent found. Arena ID: ${row.active_arena_id}`,
      inQueue: false,
    };
  }

  if (!row.in_queue) {
    return {
      error: null,
      message: "You are not in queue.",
      inQueue: false,
    };
  }

  return {
    error: null,
    message: row.opponent_available
      ? "Opponent found. Waiting for arena start..."
      : "No opponent in queue yet.",
    inQueue: true,
  };
}
