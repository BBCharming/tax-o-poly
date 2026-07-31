import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const PLAYER_TOKENS = ["🐻", "🚀", "🐱", "🐶", "🤖", "🦁"];
const PLAYER_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
];
const BOARD_SIZE = 36;

// ===================================================================
// BOARD SPACE CONFIG
// These indices MUST stay in sync with the space layout rendered in
// Frontend/src/pages/mainBoard.tsx (topSpaces/rightSpaces/bottomSpaces/
// leftSpaces + the idx-to-position formulas used there). If you ever
// reorder a space in mainBoard.tsx, update the matching array here.
// ===================================================================
const INCOME_TAX_POSITIONS = [5, 16, 21, 32]; // one "Income Tax" per side, same density as the other card tiles
const CIVIC_RISK_POSITIONS = [2, 12, 24, 30]; // one "Civic Risk" per side
const PUBLIC_GOOD_POSITIONS = [7, 15, 20, 33]; // one "Public Good" per side

// ===================================================================
// QUALITY OF LIFE INDEX (QLI)
// A simple, transparent, linear measure of collective fiscal health:
// it moves with the shared treasury relative to where the game started.
// This is deliberately simple (see report note) — it's the number that
// should visibly suffer when players collectively under-contribute,
// even if no single individual is penalised for it.
// ===================================================================
const BASELINE_TREASURY = 4250; // starting treasury == the game's "50% QLI" reference point
const QLI_SENSITIVITY = 40; // K40 of treasury change moves QLI by 1 point

function computeQLI(treasury: number): number {
  const raw = 50 + (treasury - BASELINE_TREASURY) / QLI_SENSITIVITY;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ===================================================================
// TAX DECLARATION CONFIG
//
// Fairness rule: declaring in full should not be a "sucker's payoff."
// Expected cost of under-declaring = UNDER_TAX_AMOUNT + AUDIT_CHANCE * AUDIT_PENALTY
//   = 40 + 0.35 * 180 = 103
// ...which is now >= FULL_TAX_AMOUNT (100). On average, evasion does not
// pay — but individual players can still get lucky (or unlucky), which
// preserves genuine risk/strategy rather than making the choice a dead
// giveaway. This mirrors the "compliance puzzle" in the literature review:
// real-world compliance is higher than pure audit-odds math would predict,
// because evasion isn't actually the good bet it might look like at a glance.
// ===================================================================
const FULL_TAX_AMOUNT = 100; // paid to treasury when declaring in full — no risk
const UNDER_TAX_AMOUNT = 40; // paid when under-declaring — smaller contribution
const AUDIT_CHANCE = 0.35; // 35% chance an under-declaration gets audited
const AUDIT_PENALTY = 180; // extra deduction if audited
const AUDIT_SKIP_TURNS = 1; // turns skipped as a consequence of being audited

// ===================================================================
// CARD DECKS
//
// Every card has an explicit `scope` so the deduction/credit rule is
// never implicit or guessed from which fields happen to be set:
//   "self"      — affects only the player who landed on the space.
//   "all"       — affects every player equally (a shared cost or a
//                 shared dividend), independent of the treasury.
//   "treasury"  — affects the shared Public Treasury directly, and
//                 therefore the QLI, WITHOUT touching any individual
//                 player's personal savings. No one "feels" it directly,
//                 which is the point: it models outcomes that depend on
//                 how well the collective pool is managed, not on any
//                 one person's compliance choice.
// ===================================================================
const CIVIC_RISK_CARDS = [
  { description: "Under-reported rental income was flagged in a routine check. Pay a penalty.", scope: "self", amount: -80 },
  { description: "Late VAT filing penalty issued.", scope: "self", amount: -50 },
  { description: "Random compliance audit — you lose your next turn.", scope: "self", amount: 0, skipTurns: 1 },
  { description: "A customs duty dispute is resolved against you.", scope: "self", amount: -60 },
  { description: "An unpaid informal market levy results in a fine.", scope: "self", amount: -40 },
  // Treasury-scoped: nobody's personal fault, but everyone's QLI feels it —
  // models mismanagement/leakage of already-collected public funds
  // (see Balaguer-Coll et al. on fiscal transparency in the lit review).
  { description: "A procurement scandal is uncovered — public funds were misused.", scope: "treasury", amount: -300 },
];

const PUBLIC_GOOD_CARDS = [
  { description: "Resurfaced roads cut your transport costs.", scope: "self", amount: 30 },
  { description: "The local school receives new textbooks.", scope: "self", amount: 0 },
  // "all" scope: a shared levy or shared dividend, applied to every
  // player identically regardless of who drew the card. Real-world
  // analogues: Zambia's NHIMA health-insurance levy (a small compulsory
  // contribution from everyone that funds care for everyone), or a
  // universal service subsidy (a public bus/utility rollout that lowers
  // costs for the whole community, not just the person who triggered it).
  { description: "National Health Insurance levy — every player contributes K15 to a shared clinic fund.", scope: "all", amount: -15 },
  { description: "A universal transport subsidy rolls out — every player saves K10.", scope: "all", amount: 10 },
  // Treasury-scoped positive: efficient collection, independent of any
  // one player's action, raises the shared pool (and QLI) directly.
  { description: "Efficient tax collection funds a new public library.", scope: "treasury", amount: 120 },
];

function resolveCardEffect(game: any, player: any, card: any) {
  if (card.scope === "self") {
    player.money += card.amount;
  } else if (card.scope === "all") {
    for (const p of game.players) p.money += card.amount;
  } else if (card.scope === "treasury") {
    game.treasury += card.amount;
  }
  if (card.skipTurns) {
    player.skipTurns = (player.skipTurns || 0) + card.skipTurns;
  }
}

const games = new Map();

const findPlayerIndex = (players: any[], playerId: string) =>
  players.findIndex((p) => p.ID === playerId);

const findPlayerBySocketId = (players: any[], socketId: string) =>
  players.findIndex((p) => p.socketId === socketId);

// Ends the current player's turn: checks for game-over, otherwise advances
// to the next player, skipping anyone still serving an audit-penalty skip.
function checkGameOverAndAdvance(
  roomCode: string,
  game: any,
  playerIndex: number,
) {
  const allFinished = game.players.every(
    (p: any) => p.turnNumber > game.maxTurns,
  );
  if (allFinished) {
    let winner = game.players[0];
    for (const p of game.players) if (p.money > winner.money) winner = p;
    io.to(roomCode).emit("game-over", {
      winner,
      message: `Game Over! ${winner.name} wins with K${winner.money}!`,
    });
    return;
  }

  let nextIndex = (playerIndex + 1) % game.players.length;
  let guard = 0;
  while (
    (game.players[nextIndex].skipTurns || 0) > 0 &&
    guard < game.players.length
  ) {
    game.players[nextIndex].skipTurns -= 1;
    nextIndex = (nextIndex + 1) % game.players.length;
    guard += 1;
  }

  game.currentTurn = game.players[nextIndex].ID;
  games.set(roomCode, game);
  io.to(roomCode).emit("turn-changed", { playerId: game.currentTurn });
}

io.on("connection", (socket: any) => {
  socket.on(
    "create-game",
    ({
      roomCode,
      name,
      playerId,
    }: {
      roomCode: string;
      name: string;
      playerId: string;
    }) => {
      if (games.has(roomCode)) {
        return socket.emit("error", { message: "Game already exists!" });
      }

      const hostPlayer = {
        id: playerId,
        ID: playerId,
        socketId: socket.id,
        name,
        isHost: true,
        position: 0,
        money: 1500,
        token: PLAYER_TOKENS[0],
        color: PLAYER_COLORS[0],
        turnNumber: 1,
        skipTurns: 0,
        underDeclareCount: 0,
        auditedCount: 0,
      };

      const gameData = {
        players: [hostPlayer],
        maxPlayers: 6,
        isGameStarted: false,
        currentTurn: playerId,
        turnNumber: 1,
        maxTurns: 12,
        treasury: 4250,
        qli: 50,
        gameWinner: null,
      };

      games.set(roomCode, gameData);
      socket.join(roomCode);
      socket.emit("game-created", {
        roomCode,
        players: [hostPlayer],
        playerId: playerId,
      });
    },
  );

  socket.on(
    "join-game",
    ({
      roomCode,
      name,
      playerId,
    }: {
      roomCode: string;
      name: string;
      playerId: string;
    }) => {
      const game = games.get(roomCode);
      if (!game) return socket.emit("game-not-found");
      if (game.isGameStarted)
        return socket.emit("error", { message: "Game already in progress!" });
      if (game.players.length >= game.maxPlayers)
        return socket.emit("game-full");

      const existingIndex = findPlayerIndex(game.players, playerId);
      if (existingIndex !== -1) {
        game.players[existingIndex].socketId = socket.id;
        games.set(roomCode, game);
        socket.join(roomCode);
        socket.emit("player-joined", {
          players: game.players,
          playerId: playerId,
        });
        io.to(roomCode).emit("players-updated", game.players);
        return;
      }

      const playerIndex = game.players.length;
      const newPlayer = {
        id: playerId,
        ID: playerId,
        socketId: socket.id,
        name,
        isHost: false,
        position: 0,
        money: 1500,
        token: PLAYER_TOKENS[playerIndex % PLAYER_TOKENS.length],
        color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
        turnNumber: 1,
        skipTurns: 0,
        underDeclareCount: 0,
        auditedCount: 0,
      };

      game.players.push(newPlayer);
      games.set(roomCode, game);

      socket.join(roomCode);
      socket.emit("player-joined", {
        players: game.players,
        playerId: playerId,
      });
      io.to(roomCode).emit("players-updated", game.players);
    },
  );

  socket.on(
    "rejoin-game",
    ({
      roomCode,
      playerId,
      name,
    }: {
      roomCode: string;
      playerId: string;
      name: string;
    }) => {
      const game = games.get(roomCode);
      if (!game) {
        return socket.emit("error", { message: "Game not found!" });
      }

      const playerIndex = findPlayerIndex(game.players, playerId);
      if (playerIndex === -1) {
        return socket.emit("error", { message: "Player not found in game!" });
      }

      game.players[playerIndex].socketId = socket.id;
      socket.join(roomCode);

      socket.emit("player-rejoined", {
        players: game.players,
        playerId: playerId,
        currentTurn: game.currentTurn,
        isGameStarted: game.isGameStarted,
        turnNumber: game.turnNumber,
        maxTurns: game.maxTurns,
        treasury: game.treasury,
        qli: computeQLI(game.treasury),
      });

      io.to(roomCode).emit("players-updated", game.players);
    },
  );

  socket.on("start-game", ({ roomCode }: { roomCode: string }) => {
    const game = games.get(roomCode);
    if (!game || game.isGameStarted) return;

    game.isGameStarted = true;
    game.turnNumber = 1;
    game.currentTurn = game.players[0].ID;

    games.set(roomCode, game);

    io.to(roomCode).emit("game-started", {
      currentTurn: game.currentTurn,
      players: game.players,
      turnNumber: game.turnNumber,
      maxTurns: game.maxTurns,
      treasury: game.treasury,
      qli: computeQLI(game.treasury),
    });
  });

  socket.on("roll-dice", ({ roomCode, playerId }: any) => {
    const game = games.get(roomCode);

    if (!game || !game.isGameStarted) return;
    if (game.currentTurn !== playerId) return;

    const playerIndex = findPlayerIndex(game.players, playerId);
    if (playerIndex === -1) return;

    const player = game.players[playerIndex];

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const newPosition = (player.position + dice1 + dice2) % BOARD_SIZE;

    player.position = newPosition;
    player.turnNumber += 1;

    games.set(roomCode, game);

    io.to(roomCode).emit("dice-rolled", {
      playerId,
      dice1,
      dice2,
      newPosition,
      playerTurnNumber: player.turnNumber,
    });

    // Landed on Income Tax: pause here and wait for the player's own
    // declare-tax choice before the turn advances. Broadcast to the whole
    // room (same reliable pattern as card-drawn) and let each client filter
    // by playerId — this avoids depending on player.socketId staying
    // perfectly in sync with the live connection, which a private
    // io.to(socketId) emit does not tolerate well after any reconnect.
    if (INCOME_TAX_POSITIONS.includes(newPosition)) {
      io.to(roomCode).emit("tax-prompt", { roomCode, playerId });
      return;
    }

    // Landed on a Civic Risk or Public Good space: resolve a card
    // immediately, then continue the turn as normal.
    if (
      CIVIC_RISK_POSITIONS.includes(newPosition) ||
      PUBLIC_GOOD_POSITIONS.includes(newPosition)
    ) {
      const isRisk = CIVIC_RISK_POSITIONS.includes(newPosition);
      const deck = isRisk ? CIVIC_RISK_CARDS : PUBLIC_GOOD_CARDS;
      const card = deck[Math.floor(Math.random() * deck.length)];

      resolveCardEffect(game, player, card);
      games.set(roomCode, game);

      io.to(roomCode).emit("card-drawn", {
        playerId,
        type: isRisk ? "CivicRisk" : "PublicGood",
        description: card.description,
        players: game.players,
        newTreasury: game.treasury,
        qli: computeQLI(game.treasury),
      });
    }

    checkGameOverAndAdvance(roomCode, game, playerIndex);
  });

  socket.on(
    "declare-tax",
    ({
      roomCode,
      playerId,
      choice,
    }: {
      roomCode: string;
      playerId: string;
      choice: "full" | "under";
    }) => {
      const game = games.get(roomCode);
      if (!game || !game.isGameStarted) return;

      const playerIndex = findPlayerIndex(game.players, playerId);
      if (playerIndex === -1) return;
      const player = game.players[playerIndex];

      let audited = false;
      let penalty = 0;

      if (choice === "full") {
        player.money -= FULL_TAX_AMOUNT;
        game.treasury += FULL_TAX_AMOUNT;
      } else {
        player.money -= UNDER_TAX_AMOUNT;
        game.treasury += UNDER_TAX_AMOUNT;
        player.underDeclareCount = (player.underDeclareCount || 0) + 1;

        if (Math.random() < AUDIT_CHANCE) {
          audited = true;
          penalty = AUDIT_PENALTY;
          player.money -= penalty;
          player.skipTurns = (player.skipTurns || 0) + AUDIT_SKIP_TURNS;
          player.auditedCount = (player.auditedCount || 0) + 1;
        }
      }

      games.set(roomCode, game);

      io.to(roomCode).emit("tax-resolved", {
        playerId,
        choice,
        audited,
        penalty,
        players: game.players,
        newTreasury: game.treasury,
        qli: computeQLI(game.treasury),
      });

      checkGameOverAndAdvance(roomCode, game, playerIndex);
    },
  );

  socket.on("leave-game", ({ roomCode }: { roomCode: string }) => {
    const game = games.get(roomCode);
    if (!game) return;

    const playerIndex = findPlayerBySocketId(game.players, socket.id);
    if (playerIndex === -1) return;

    const wasHost = game.players[playerIndex].isHost;
    const wasCurrentTurn = game.currentTurn === game.players[playerIndex].ID;

    game.players.splice(playerIndex, 1);

    if (game.players.length === 0) {
      games.delete(roomCode);
      socket.leave(roomCode);
      return;
    }

    if (wasHost) {
      game.players[0].isHost = true;
      io.to(roomCode).emit("host-left", {
        newHost: game.players[0].ID,
        newHostName: game.players[0].name,
      });
    }

    if (wasCurrentTurn) {
      game.currentTurn = game.players[0].ID;
      io.to(roomCode).emit("turn-changed", {
        playerId: game.currentTurn,
        turnNumber: game.turnNumber,
      });
    }

    games.set(roomCode, game);
    io.to(roomCode).emit("players-updated", game.players);
    socket.leave(roomCode);
    socket.emit("left-game", { message: "You have left the game" });
  });

  socket.on("disconnect", () => {
    for (const [roomCode, game] of games.entries()) {
      const playerIndex = findPlayerBySocketId(game.players, socket.id);
      if (playerIndex === -1) continue;

      game.players[playerIndex].socketId = null;
      games.set(roomCode, game);

      io.to(roomCode).emit("players-updated", game.players);
      break;
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});