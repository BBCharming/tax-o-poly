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

      const players = [{ id: socket.id, name, isHost: true }];
      games.set(roomCode, { players, maxPlayers: 6, isGameStarted: false });

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

      const newPlayer = { id: socket.id, name, isHost: false };
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
