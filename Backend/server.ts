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

const BOARD_SIZE = 36;

const PLAYER_STYLES = [
  {
    token: "🐻",
    bg: "bg-red-500",
    border: "border-red-600",
    text: "text-red-500",
  },
  {
    token: "🚀",
    bg: "bg-blue-500",
    border: "border-blue-600",
    text: "text-blue-500",
  },
  {
    token: "🐱",
    bg: "bg-green-500",
    border: "border-green-600",
    text: "text-green-500",
  },
  {
    token: "🐶",
    bg: "bg-yellow-500",
    border: "border-yellow-600",
    text: "text-yellow-500",
  },
  {
    token: "🤖",
    bg: "bg-purple-500",
    border: "border-purple-600",
    text: "text-purple-500",
  },
  {
    token: "🦁",
    bg: "bg-pink-500",
    border: "border-pink-600",
    text: "text-pink-500",
  },
];

// BOARD LAYOUT
const BOARD_SPACES = [
  /* 0  */ { name: "GO", color: "gray", kind: "corner" },
  /* 1  */ { name: "Airport", price: "K260", color: "blue" },
  /* 2  */ { name: "Civic Risk", color: "orange", kind: "civic-risk" },
  /* 3  */ { name: "Court", price: "K220", color: "teal" },
  /* 4  */ { name: "Fire Station", price: "K200", color: "teal" },
  /* 5  */ { name: "Income Tax", color: "gray", kind: "income-tax" },
  /* 6  */ { name: "University", price: "K180", color: "green" },
  /* 7  */ { name: "Public Good", color: "orange", kind: "public-good" },
  /* 8  */ { name: "Stadium", price: "K160", color: "green" },
  /* 9  */ { name: "Free Parking", color: "gray", kind: "corner" },
  /* 10 */ { name: "Clinic", price: "K120", color: "blue" },
  /* 11 */ { name: "School", price: "K160", color: "green" },
  /* 12 */ { name: "Civic Risk", color: "orange", kind: "civic-risk" },
  /* 13 */ { name: "Mine", price: "K200", color: "brown" },
  /* 14 */ { name: "Factory", price: "K180", color: "brown" },
  /* 15 */ { name: "Public Good", color: "orange", kind: "public-good" },
  /* 16 */ { name: "Income Tax", color: "gray", kind: "income-tax" },
  /* 17 */ { name: "Port", price: "K240", color: "blue" },
  /* 18 */ { name: "Audit Lock!", color: "red", kind: "corner" },
  /* 19 */ { name: "Bridge", price: "K220", color: "blue" },
  /* 20 */ { name: "Public Good", color: "orange", kind: "public-good" },
  /* 21 */ { name: "Income Tax", color: "gray", kind: "income-tax" },
  /* 22 */ { name: "Library", price: "K160", color: "green" },
  /* 23 */ { name: "Market", price: "K180", color: "green" },
  /* 24 */ { name: "Civic Risk", color: "orange", kind: "civic-risk" },
  /* 25 */ { name: "Park", price: "K140", color: "green" },
  /* 26 */ { name: "Sewer", price: "K100", color: "teal" },
  /* 27 */ { name: "Tax Office", color: "gray", kind: "corner" },
  /* 28 */ { name: "Free Pass", color: "gray" },
  /* 29 */ { name: "Hospital", price: "K200", color: "teal" },
  /* 30 */ { name: "Civic Risk", color: "orange", kind: "civic-risk" },
  /* 31 */ { name: "School", price: "K150", color: "green" },
  /* 32 */ { name: "Income Tax", color: "gray", kind: "income-tax" },
  /* 33 */ { name: "Public Good", color: "orange", kind: "public-good" },
  /* 34 */ { name: "Water", price: "K175", color: "teal" },
  /* 35 */ { name: "Police", price: "K120", color: "teal" },
];

if (BOARD_SPACES.length !== BOARD_SIZE) {
  throw new Error(
    `BOARD_SPACES has ${BOARD_SPACES.length} entries but BOARD_SIZE is ${BOARD_SIZE}`,
  );
}

const positionsOfKind = (kind: string) =>
  BOARD_SPACES.reduce<number[]>((acc, space, index) => {
    if (space.kind === kind) acc.push(index);
    return acc;
  }, []);

const INCOME_TAX_POSITIONS = positionsOfKind("income-tax");
const CIVIC_RISK_POSITIONS = positionsOfKind("civic-risk");
const PUBLIC_GOOD_POSITIONS = positionsOfKind("public-good");

// QUALITY OF LIFE INDEX (QLI)
const BASELINE_TREASURY = 4250;
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
// ===================================================================
const FULL_TAX_AMOUNT = 100;
const UNDER_TAX_AMOUNT = 40;
const AUDIT_CHANCE = 0.35;
const AUDIT_PENALTY = 180;
const AUDIT_SKIP_TURNS = 1;

// ===================================================================
// CARD DECKS
//
// Every card has an explicit `scope` so the deduction/credit rule is
// never implicit or guessed from which fields happen to be set:
//   "self"      — affects only the player who landed on the space.
//   "all"       — affects every player equally, independent of the treasury.
//   "treasury"  — affects the shared Public Treasury directly, and
//                 therefore the QLI, WITHOUT touching any individual
//                 player's personal savings. No one "feels" it directly,
//                 which is the point: it models outcomes that depend on
//                 how well the collective pool is managed, not on any
//                 one person's compliance choice.
// ===================================================================
const CIVIC_RISK_CARDS = [
  {
    description:
      "Under-reported rental income was flagged in a routine check. Pay a penalty.",
    scope: "self",
    amount: -80,
  },
  {
    description: "Late VAT filing penalty issued.",
    scope: "self",
    amount: -50,
  },
  {
    description: "Random compliance audit — you lose your next turn.",
    scope: "self",
    amount: 0,
    skipTurns: 1,
  },
  {
    description: "A customs duty dispute is resolved against you.",
    scope: "self",
    amount: -60,
  },
  {
    description: "An unpaid informal market levy results in a fine.",
    scope: "self",
    amount: -40,
  },
  {
    description:
      "A procurement scandal is uncovered — public funds were misused.",
    scope: "treasury",
    amount: -300,
  },
];

const PUBLIC_GOOD_CARDS = [
  {
    description: "Resurfaced roads cut your transport costs.",
    scope: "self",
    amount: 30,
  },
  {
    description: "The local school receives new textbooks.",
    scope: "self",
    amount: 0,
  },
  {
    description:
      "National Health Insurance levy — every player contributes K15 to a shared clinic fund.",
    scope: "all",
    amount: -15,
  },
  {
    description:
      "A universal transport subsidy rolls out — every player saves K10.",
    scope: "all",
    amount: 10,
  },
  {
    description: "Efficient tax collection funds a new public library.",
    scope: "treasury",
    amount: 120,
  },
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
  players.findIndex((p) => p.id === playerId);

const findPlayerBySocketId = (players: any[], socketId: string) =>
  players.findIndex((p) => p.socketId === socketId);

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

  game.currentTurn = game.players[nextIndex].id;
  games.set(roomCode, game);
  io.to(roomCode).emit("turn-changed", { playerId: game.currentTurn });
}

io.on("connection", (socket: any) => {
  socket.emit("board-config", {
    boardSize: BOARD_SIZE,
    spaces: BOARD_SPACES,
    playerStyles: PLAYER_STYLES,
  });

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
        socketId: socket.id,
        name,
        isHost: true,
        position: 0,
        money: 1500,
        style: PLAYER_STYLES[0],
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
        socketId: socket.id,
        name,
        isHost: false,
        position: 0,
        money: 1500,
        style: PLAYER_STYLES[playerIndex % PLAYER_STYLES.length],
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
        spaces: BOARD_SPACES,
        boardSize: BOARD_SIZE,
        playerStyles: PLAYER_STYLES,
      });

      io.to(roomCode).emit("players-updated", game.players);
    },
  );

  socket.on("start-game", ({ roomCode }: { roomCode: string }) => {
    const game = games.get(roomCode);
    if (!game || game.isGameStarted) return;

    game.isGameStarted = true;
    game.turnNumber = 1;
    game.currentTurn = game.players[0].id;

    games.set(roomCode, game);

    io.to(roomCode).emit("game-started", {
      currentTurn: game.currentTurn,
      players: game.players,
      turnNumber: game.turnNumber,
      maxTurns: game.maxTurns,
      treasury: game.treasury,
      qli: computeQLI(game.treasury),
      spaces: BOARD_SPACES,
      boardSize: BOARD_SIZE,
      playerStyles: PLAYER_STYLES,
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

    if (INCOME_TAX_POSITIONS.includes(newPosition)) {
      io.to(roomCode).emit("tax-prompt", { roomCode, playerId });
      return;
    }

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
    const wasCurrentTurn = game.currentTurn === game.players[playerIndex].id;

    game.players.splice(playerIndex, 1);

    if (game.players.length === 0) {
      games.delete(roomCode);
      socket.leave(roomCode);
      return;
    }

    if (wasHost) {
      game.players[0].isHost = true;
      io.to(roomCode).emit("host-left", {
        newHost: game.players[0].id,
        newHostName: game.players[0].name,
      });
    }

    if (wasCurrentTurn) {
      game.currentTurn = game.players[0].id;
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
