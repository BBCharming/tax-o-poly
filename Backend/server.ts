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

const games = new Map();

const findPlayerIndex = (players: any[], playerId: string) =>
  players.findIndex((p) => p.ID === playerId);

const findPlayerBySocketId = (players: any[], socketId: string) =>
  players.findIndex((p) => p.socketId === socketId);

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
      };

      const gameData = {
        players: [hostPlayer],
        maxPlayers: 6,
        isGameStarted: false,
        currentTurn: playerId,
        turnNumber: 1,
        maxTurns: 12,
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

    const nextIndex = (playerIndex + 1) % game.players.length;
    game.currentTurn = game.players[nextIndex].ID;
    games.set(roomCode, game);

    io.to(roomCode).emit("turn-changed", { playerId: game.currentTurn });
  });

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
