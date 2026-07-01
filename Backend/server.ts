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

// Config
const PLAYER_TOKENS = ["🐻", "🚀", "🐱", "🐶", "🤖", "🦁"];
const PLAYER_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
];

const games = new Map();

// Helper to get player by ID
const findPlayerIndex = (players: any[], playerId: string) =>
  players.findIndex((p) => p.ID === playerId || p.id === playerId);

io.on("connection", (socket: any) => {
  console.log("New client connected:", socket.id);

  // ====================== CREATE GAME ======================
  socket.on(
    "create-game",
    ({ roomCode, name }: { roomCode: string; name: string }) => {
      if (games.has(roomCode)) {
        return socket.emit("error", { message: "Game already exists!" });
      }

      const hostPlayer = {
        id: socket.id,
        ID: socket.id,
        name,
        isHost: true,
        position: 0,
        money: 1500,
        token: PLAYER_TOKENS[0],
        color: PLAYER_COLORS[0],
      };

      const gameData = {
        players: [hostPlayer],
        maxPlayers: 6,
        isGameStarted: false,
        currentTurn: socket.id,
        turnNumber: 1,
        maxTurns: 12,
        gameWinner: null,
      };

      games.set(roomCode, gameData);
      socket.join(roomCode);
      socket.emit("game-created", {
        roomCode,
        players: [hostPlayer],
        playerId: socket.id,
      });
    },
  );

  // ====================== JOIN GAME ======================
  socket.on(
    "join-game",
    ({ roomCode, name }: { roomCode: string; name: string }) => {
      const game = games.get(roomCode);
      if (!game) return socket.emit("game-not-found");
      if (game.isGameStarted)
        return socket.emit("error", { message: "Game already in progress!" });
      if (game.players.length >= game.maxPlayers)
        return socket.emit("game-full");

      const playerIndex = game.players.length;
      const newPlayer = {
        id: socket.id,
        ID: socket.id,
        name,
        isHost: false,
        position: 0,
        money: 1500,
        token: PLAYER_TOKENS[playerIndex % PLAYER_TOKENS.length],
        color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
      };

      game.players.push(newPlayer);
      games.set(roomCode, game);

      socket.join(roomCode);
      socket.emit("player-joined", {
        players: game.players,
        playerId: socket.id,
      });
      io.to(roomCode).emit("players-updated", game.players);
    },
  );

  // ====================== START GAME ======================
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
    });
  });

  // ====================== ROLL DICE ======================
  socket.on(
    "roll-dice",
    ({ roomCode, playerId, dice1, dice2, newPosition }: any) => {
      const game = games.get(roomCode);
      if (!game || !game.isGameStarted) return;

      const playerIndex = findPlayerIndex(game.players, playerId);
      if (playerIndex === -1) return;

      // Update position
      game.players[playerIndex].position = newPosition;
      game.turnNumber += 1;

      games.set(roomCode, game);

      // Broadcast roll
      io.to(roomCode).emit("dice-rolled", {
        playerId,
        dice1,
        dice2,
        newPosition,
        turnNumber: game.turnNumber,
      });

      // Check game over
      if (game.turnNumber >= game.maxTurns) {
        let winner = game.players[0];
        for (const p of game.players) {
          if (p.money > winner.money) winner = p;
        }
        io.to(roomCode).emit("game-over", {
          winner,
          message: `Game Over! ${winner.name} wins with K${winner.money}!`,
        });
        return;
      }

      // Next turn
      const nextIndex = (playerIndex + 1) % game.players.length;
      game.currentTurn = game.players[nextIndex].ID;
      games.set(roomCode, game);

      io.to(roomCode).emit("turn-changed", {
        playerId: game.currentTurn,
        turnNumber: game.turnNumber,
      });
    },
  );

  // ====================== LEAVE GAME ======================
  socket.on("leave-game", ({ roomCode }: { roomCode: string }) => {
    const game = games.get(roomCode);
    if (!game) return;

    const playerIndex = findPlayerIndex(game.players, socket.id);
    if (playerIndex === -1) return;

    const wasHost = game.players[playerIndex].isHost;
    const wasCurrentTurn = game.currentTurn === socket.id;

    game.players.splice(playerIndex, 1);

    if (game.players.length === 0) {
      games.delete(roomCode);
      socket.leave(roomCode);
      return;
    }

    // New host if needed
    if (wasHost) {
      game.players[0].isHost = true;
      io.to(roomCode).emit("host-left", {
        newHost: game.players[0].ID,
        newHostName: game.players[0].name,
      });
    }

    // Next turn if current player left
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

  // ====================== DISCONNECT ======================
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    for (const [roomCode, game] of games.entries()) {
      const playerIndex = findPlayerIndex(game.players, socket.id);
      if (playerIndex === -1) continue;

      const wasHost = game.players[playerIndex].isHost;
      const wasCurrentTurn = game.currentTurn === socket.id;

      game.players.splice(playerIndex, 1);

      if (game.players.length === 0) {
        games.delete(roomCode);
        break;
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
      break;
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
