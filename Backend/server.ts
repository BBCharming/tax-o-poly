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

// Player tokens and colors for assignment
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

io.on("connection", (socket: any) => {
  console.log("New client connected:", socket.id);

  // Create new game
  socket.on(
    "create-game",
    ({
      roomCode,
      name,
      isHost,
    }: {
      roomCode: string;
      name: string;
      isHost: boolean;
    }) => {
      if (games.has(roomCode)) {
        socket.emit("error", { message: "Game already exists!" });
        return;
      }

      // Create host player with token and color
      const hostPlayer = {
        id: socket.id,
        name,
        isHost: true,
        position: 0,
        money: 1500,
        token: PLAYER_TOKENS[0],
        color: PLAYER_COLORS[0],
      };

      const players = [hostPlayer];
      games.set(roomCode, {
        players,
        maxPlayers: 6,
        isGameStarted: false,
        currentTurn: socket.id, // Host goes first
      });

      socket.join(roomCode);
      socket.emit("game-created", { roomCode, players, playerId: socket.id });
    },
  );

  // Join existing game
  socket.on(
    "join-game",
    ({
      roomCode,
      name,
      isHost,
    }: {
      roomCode: string;
      name: string;
      isHost: boolean;
    }) => {
      const game = games.get(roomCode);

      if (!game) {
        socket.emit("game-not-found");
        return;
      }

      if (game.isGameStarted) {
        socket.emit("error", { message: "Game already in progress!" });
        return;
      }

      if (game.players.length >= game.maxPlayers) {
        socket.emit("game-full");
        return;
      }

      // Assign token and color based on player count
      const playerIndex = game.players.length;
      const newPlayer = {
        id: socket.id,
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
      io.to(roomCode).emit("players-updated", game.players);
      socket.emit("player-joined", {
        players: game.players,
        playerId: socket.id,
      });
    },
  );

  // Start game
  socket.on("start-game", ({ roomCode }: { roomCode: string }) => {
    const game = games.get(roomCode);

    if (game && !game.isGameStarted) {
      game.isGameStarted = true;
      games.set(roomCode, game);
      io.to(roomCode).emit("game-started");
    }
  });

  // Handle dice roll
  socket.on(
    "roll-dice",
    ({
      roomCode,
      playerId,
      dice1,
      dice2,
      newPosition,
    }: {
      roomCode: string;
      playerId: string;
      dice1: number;
      dice2: number;
      newPosition: number;
    }) => {
      const game = games.get(roomCode);

      if (!game || !game.isGameStarted) return;

      // Update player position
      const player = game.players.find((p: any) => p.id === playerId);
      if (player) {
        player.position = newPosition;
      }

      // Broadcast dice roll to all players
      io.to(roomCode).emit("dice-rolled", {
        playerId,
        dice1,
        dice2,
        newPosition,
      });

      // Move to next turn
      const currentIndex = game.players.findIndex(
        (p: any) => p.id === playerId,
      );
      const nextIndex = (currentIndex + 1) % game.players.length;
      const nextPlayer = game.players[nextIndex];
      game.currentTurn = nextPlayer.id;

      games.set(roomCode, game);

      // Broadcast turn change
      io.to(roomCode).emit("turn-changed", {
        playerId: nextPlayer.id,
      });
    },
  );

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Remove player from any game they were in
    for (const [roomCode, game] of games.entries()) {
      const playerIndex = game.players.findIndex(
        (p: { id: string }) => p.id === socket.id,
      );

      if (playerIndex !== -1) {
        const wasHost = game.players[playerIndex].isHost;
        game.players.splice(playerIndex, 1);

        if (game.players.length === 0) {
          // Delete empty game
          games.delete(roomCode);
        } else if (wasHost && game.players.length > 0) {
          // Assign new host
          game.players[0].isHost = true;
          io.to(roomCode).emit("players-updated", game.players);
          io.to(roomCode).emit("host-left");
        } else {
          io.to(roomCode).emit("players-updated", game.players);
        }

        games.set(roomCode, game);
        break;
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
