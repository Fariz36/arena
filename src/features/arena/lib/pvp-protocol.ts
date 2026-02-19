export type ClientToServerEvent =
  | { type: "AUTH"; user_id: string; name: string }
  | { type: "JOIN_QUEUE"; mode: "classic" }
  | { type: "LEAVE_QUEUE" }
  | { type: "RESUME_MATCH"; match_id: string }
  | { type: "ANSWER"; match_id: string; question_id: string; selected_option: string }
  | { type: "LEAVE_MATCH"; match_id: string }
  | { type: "PING" };

export type ServerQuestionPayload = {
  match_id: string;
  question_id: string;
  text: string;
  options: Array<{ id: string; text: string }>;
  time_limit: number;
  started_at: string;
  deadline_at: string;
  question_no: number;
  total_questions: number;
};

export type ServerToClientEvent =
  | { type: "QUEUE_WAITING"; queue_size: number }
  | { type: "MATCH_FOUND"; match_id: string; opponent: { id: string; name: string }; countdown: number }
  | { type: "MATCH_CANCELLED"; reason: string; winner_id: string | null }
  | ({ type: "QUESTION" } & ServerQuestionPayload)
  | {
      type: "ROUND_RESULT";
      match_id: string;
      question_id: string;
      correct_answer: string;
      scores: Record<string, number>;
      answers: Record<string, string | null>;
    }
  | {
      type: "MATCH_RESULT";
      match_id: string;
      winner: string | null;
      final_scores: Record<string, number>;
    }
  | { type: "ERROR"; message: string }
  | { type: "PONG"; ts: number };

export function parseServerEvent(raw: string): ServerToClientEvent | null {
  try {
    const parsed = JSON.parse(raw) as { type?: unknown };
    if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") {
      return null;
    }
    return parsed as ServerToClientEvent;
  } catch {
    return null;
  }
}

