import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";

const PORT = Number.parseInt(process.env.PVP_WS_PORT ?? "8080", 10);
const COUNTDOWN_MS = 3000;
const ROUND_GAP_MS = 1500;
const DISCONNECT_GRACE_MS = 10000;
const MAX_QUESTIONS = 5;

const connections = new Map();
const queue = [];
const matches = new Map();
const userToMatch = new Map();

const questionBank = [
  {
    id: "q1",
    text: "What is 2 + 2?",
    options: [
      { id: "2", text: "2" },
      { id: "3", text: "3" },
      { id: "4", text: "4" },
      { id: "5", text: "5" },
    ],
    correctOptionId: "4",
    timeLimitSeconds: 10,
  },
  {
    id: "q2",
    text: "Capital of Japan?",
    options: [
      { id: "tokyo", text: "Tokyo" },
      { id: "seoul", text: "Seoul" },
      { id: "osaka", text: "Osaka" },
      { id: "beijing", text: "Beijing" },
    ],
    correctOptionId: "tokyo",
    timeLimitSeconds: 10,
  },
  {
    id: "q3",
    text: "Which one is a prime number?",
    options: [
      { id: "9", text: "9" },
      { id: "15", text: "15" },
      { id: "17", text: "17" },
      { id: "21", text: "21" },
    ],
    correctOptionId: "17",
    timeLimitSeconds: 10,
  },
  {
    id: "q4",
    text: "HTTP status for Not Found?",
    options: [
      { id: "200", text: "200" },
      { id: "301", text: "301" },
      { id: "404", text: "404" },
      { id: "500", text: "500" },
    ],
    correctOptionId: "404",
    timeLimitSeconds: 10,
  },
  {
    id: "q5",
    text: "Which planet is known as the Red Planet?",
    options: [
      { id: "venus", text: "Venus" },
      { id: "mars", text: "Mars" },
      { id: "jupiter", text: "Jupiter" },
      { id: "saturn", text: "Saturn" },
    ],
    correctOptionId: "mars",
    timeLimitSeconds: 10,
  },
];

function createQuestionsForMatch() {
  return questionBank.slice(0, MAX_QUESTIONS).map((question) => ({ ...question }));
}

function sendToUser(userId, payload) {
  const conn = connections.get(userId);
  if (!conn) {
    return;
  }
  if (conn.socket.readyState === conn.socket.OPEN) {
    conn.socket.send(JSON.stringify(payload));
  }
}

function sendError(userId, message) {
  sendToUser(userId, { type: "ERROR", message });
}

function sendToMatch(matchId, payload) {
  const match = matches.get(matchId);
  if (!match) {
    return;
  }
  for (const userId of match.players) {
    sendToUser(userId, payload);
  }
}

function removeFromQueue(userId) {
  const idx = queue.indexOf(userId);
  if (idx >= 0) {
    queue.splice(idx, 1);
  }
}

function clearMatchTimers(match) {
  if (match.roundTimer) {
    clearTimeout(match.roundTimer);
    match.roundTimer = null;
  }
  if (match.countdownTimer) {
    clearTimeout(match.countdownTimer);
    match.countdownTimer = null;
  }
}

function finishMatch(matchId, forcedWinnerId = null, reason = null) {
  const match = matches.get(matchId);
  if (!match) {
    return;
  }

  clearMatchTimers(match);

  let winnerId = forcedWinnerId;
  if (!winnerId) {
    const [p1, p2] = match.players;
    if (match.scores[p1] > match.scores[p2]) {
      winnerId = p1;
    } else if (match.scores[p2] > match.scores[p1]) {
      winnerId = p2;
    } else {
      winnerId = null;
    }
  }

  if (reason) {
    sendToMatch(matchId, { type: "MATCH_CANCELLED", reason, winner_id: winnerId });
  }

  sendToMatch(matchId, {
    type: "MATCH_RESULT",
    match_id: matchId,
    winner: winnerId,
    final_scores: match.scores,
  });

  for (const userId of match.players) {
    userToMatch.delete(userId);
  }
  matches.delete(matchId);
}

function calculateRoundScore(isCorrect, elapsedMs, timeLimitMs) {
  if (!isCorrect) {
    return 0;
  }
  const base = 100;
  const speedBonus = Math.max(Math.floor(((timeLimitMs - elapsedMs) / timeLimitMs) * 50), 0);
  return base + speedBonus;
}

function endCurrentQuestion(matchId) {
  const match = matches.get(matchId);
  if (!match) {
    return;
  }

  clearMatchTimers(match);

  const currentQuestion = match.questions[match.currentQuestionIndex];
  if (!currentQuestion) {
    finishMatch(matchId);
    return;
  }

  const timeLimitMs = currentQuestion.timeLimitSeconds * 1000;

  for (const userId of match.players) {
    const record = match.answers[userId] ?? null;
    const isCorrect = Boolean(record && record.selectedOption === currentQuestion.correctOptionId);
    const elapsedMs = record ? Math.max(record.timestamp - match.questionStartedAt, 0) : timeLimitMs;
    match.scores[userId] += calculateRoundScore(isCorrect, elapsedMs, timeLimitMs);
  }

  const answerMap = Object.fromEntries(
    match.players.map((userId) => [userId, match.answers[userId]?.selectedOption ?? null]),
  );

  sendToMatch(matchId, {
    type: "ROUND_RESULT",
    match_id: matchId,
    question_id: currentQuestion.id,
    correct_answer: currentQuestion.correctOptionId,
    scores: match.scores,
    answers: answerMap,
  });

  match.currentQuestionIndex += 1;
  match.answers = {};

  if (match.currentQuestionIndex >= match.questions.length) {
    setTimeout(() => finishMatch(matchId), ROUND_GAP_MS);
    return;
  }

  match.roundTimer = setTimeout(() => {
    startQuestion(matchId);
  }, ROUND_GAP_MS);
}

function startQuestion(matchId) {
  const match = matches.get(matchId);
  if (!match) {
    return;
  }

  const currentQuestion = match.questions[match.currentQuestionIndex];
  if (!currentQuestion) {
    finishMatch(matchId);
    return;
  }

  const startedAt = Date.now();
  const deadlineAt = startedAt + currentQuestion.timeLimitSeconds * 1000;

  match.state = "question";
  match.questionStartedAt = startedAt;
  match.questionDeadlineAt = deadlineAt;
  match.answers = {};

  sendToMatch(matchId, {
    type: "QUESTION",
    match_id: matchId,
    question_id: currentQuestion.id,
    text: currentQuestion.text,
    options: currentQuestion.options,
    time_limit: currentQuestion.timeLimitSeconds,
    started_at: new Date(startedAt).toISOString(),
    deadline_at: new Date(deadlineAt).toISOString(),
    question_no: match.currentQuestionIndex + 1,
    total_questions: match.questions.length,
  });

  match.roundTimer = setTimeout(() => {
    endCurrentQuestion(matchId);
  }, currentQuestion.timeLimitSeconds * 1000);
}

function createMatch(playerA, playerB) {
  const matchId = randomUUID();
  const playerAConn = connections.get(playerA);
  const playerBConn = connections.get(playerB);
  if (!playerAConn || !playerBConn) {
    return;
  }

  const match = {
    id: matchId,
    players: [playerA, playerB],
    scores: {
      [playerA]: 0,
      [playerB]: 0,
    },
    currentQuestionIndex: 0,
    state: "countdown",
    answers: {},
    questionStartedAt: 0,
    questionDeadlineAt: 0,
    roundTimer: null,
    countdownTimer: null,
    questions: createQuestionsForMatch(),
  };

  matches.set(matchId, match);
  userToMatch.set(playerA, matchId);
  userToMatch.set(playerB, matchId);
  removeFromQueue(playerA);
  removeFromQueue(playerB);

  sendToUser(playerA, {
    type: "MATCH_FOUND",
    match_id: matchId,
    opponent: { id: playerB, name: playerBConn.name },
    countdown: 3,
  });
  sendToUser(playerB, {
    type: "MATCH_FOUND",
    match_id: matchId,
    opponent: { id: playerA, name: playerAConn.name },
    countdown: 3,
  });

  match.countdownTimer = setTimeout(() => {
    startQuestion(matchId);
  }, COUNTDOWN_MS);
}

function tryMatchmaking() {
  while (queue.length >= 2) {
    const p1 = queue.shift();
    const p2 = queue.shift();
    if (!p1 || !p2 || p1 === p2) {
      continue;
    }
    createMatch(p1, p2);
  }
}

function validateAuth(connection) {
  if (!connection.userId) {
    return { ok: false, reason: "Unauthorized. Send AUTH first." };
  }
  return { ok: true };
}

function handleAnswer(userId, payload) {
  const match = matches.get(payload.match_id);
  if (!match) {
    sendError(userId, "Match not found.");
    return;
  }
  if (!match.players.includes(userId)) {
    sendError(userId, "Forbidden: not a participant.");
    return;
  }
  if (match.state !== "question") {
    sendError(userId, "Question is not active.");
    return;
  }
  const currentQuestion = match.questions[match.currentQuestionIndex];
  if (!currentQuestion || currentQuestion.id !== payload.question_id) {
    sendError(userId, "Question mismatch.");
    return;
  }
  if (match.answers[userId]) {
    sendError(userId, "Already answered this question.");
    return;
  }

  match.answers[userId] = {
    selectedOption: payload.selected_option,
    timestamp: Date.now(),
  };

  if (Object.keys(match.answers).length >= 2) {
    endCurrentQuestion(payload.match_id);
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket) => {
  const connection = { socket, userId: null, name: null, disconnectTimer: null };

  socket.on("message", (rawData) => {
    let payload;
    try {
      payload = JSON.parse(String(rawData));
    } catch {
      return;
    }

    if (payload.type === "AUTH") {
      if (typeof payload.user_id !== "string" || typeof payload.name !== "string") {
        return;
      }
      connection.userId = payload.user_id;
      connection.name = payload.name;
      if (connection.disconnectTimer) {
        clearTimeout(connection.disconnectTimer);
        connection.disconnectTimer = null;
      }
      const old = connections.get(connection.userId);
      if (old && old.socket !== socket) {
        old.socket.close();
      }
      connections.set(connection.userId, connection);
      return;
    }

    const auth = validateAuth(connection);
    if (!auth.ok) {
      socket.send(JSON.stringify({ type: "ERROR", message: auth.reason }));
      return;
    }

    const userId = connection.userId;

    if (payload.type === "JOIN_QUEUE") {
      if (userToMatch.has(userId)) {
        sendError(userId, "Already in match.");
        return;
      }
      if (queue.includes(userId)) {
        sendError(userId, "Already in queue.");
        return;
      }

      queue.push(userId);
      sendToUser(userId, { type: "QUEUE_WAITING", queue_size: queue.length });
      tryMatchmaking();
      return;
    }

    if (payload.type === "LEAVE_QUEUE") {
      removeFromQueue(userId);
      return;
    }

    if (payload.type === "RESUME_MATCH") {
      if (typeof payload.match_id !== "string") {
        sendError(userId, "Invalid match id.");
        return;
      }
      const match = matches.get(payload.match_id);
      if (!match || !match.players.includes(userId)) {
        sendError(userId, "Match not found for this user.");
        return;
      }
      const opponentId = match.players.find((id) => id !== userId) ?? null;
      const opponentConn = opponentId ? connections.get(opponentId) : null;
      sendToUser(userId, {
        type: "MATCH_FOUND",
        match_id: match.id,
        opponent: { id: opponentId, name: opponentConn?.name ?? "Opponent" },
        countdown: 0,
      });

      if (match.state === "question") {
        const currentQuestion = match.questions[match.currentQuestionIndex];
        if (currentQuestion) {
          sendToUser(userId, {
            type: "QUESTION",
            match_id: match.id,
            question_id: currentQuestion.id,
            text: currentQuestion.text,
            options: currentQuestion.options,
            time_limit: currentQuestion.timeLimitSeconds,
            started_at: new Date(match.questionStartedAt).toISOString(),
            deadline_at: new Date(match.questionDeadlineAt).toISOString(),
            question_no: match.currentQuestionIndex + 1,
            total_questions: match.questions.length,
          });
        }
      }
      return;
    }

    if (payload.type === "ANSWER") {
      if (
        typeof payload.match_id !== "string"
        || typeof payload.question_id !== "string"
        || typeof payload.selected_option !== "string"
      ) {
        sendError(userId, "Invalid ANSWER payload.");
        return;
      }
      handleAnswer(userId, payload);
      return;
    }

    if (payload.type === "LEAVE_MATCH") {
      if (typeof payload.match_id !== "string") {
        return;
      }
      const match = matches.get(payload.match_id);
      if (!match || !match.players.includes(userId)) {
        return;
      }
      const winnerId = match.players.find((id) => id !== userId) ?? null;
      finishMatch(payload.match_id, winnerId, "Opponent left the match.");
      return;
    }

    if (payload.type === "PING") {
      sendToUser(userId, { type: "PONG", ts: Date.now() });
    }
  });

  socket.on("close", () => {
    if (!connection.userId) {
      return;
    }

    connections.delete(connection.userId);
    removeFromQueue(connection.userId);

    const matchId = userToMatch.get(connection.userId);
    if (!matchId) {
      return;
    }
    const match = matches.get(matchId);
    if (!match) {
      return;
    }

    connection.disconnectTimer = setTimeout(() => {
      const winnerId = match.players.find((id) => id !== connection.userId) ?? null;
      finishMatch(matchId, winnerId, "Player disconnected.");
    }, DISCONNECT_GRACE_MS);
  });
});

console.log(`PvP WebSocket server listening on ws://localhost:${PORT}`);
