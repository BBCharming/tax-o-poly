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
        turnNumber: 1, // Track turns
        maxTurns: 12, // 12 months in a year
        gameWinner: null, // Track winner
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

      // Send the current game state to the new player
      socket.emit("player-joined", {
        players: game.players,
        playerId: socket.id,
      });

      // Broadcast updated player list to everyone
      io.to(roomCode).emit("players-updated", game.players);
    },
  );

  // Handle player leaving gracefully (not disconnecting)
  socket.on("leave-game", ({ roomCode }: { roomCode: string }) => {
    const game = games.get(roomCode);
    if (!game) return;

    const playerIndex = game.players.findIndex((p: any) => p.id === socket.id);
    if (playerIndex === -1) return;

    const wasHost = game.players[playerIndex].isHost;
    const wasCurrentTurn = game.currentTurn === socket.id;

    // Remove player
    game.players.splice(playerIndex, 1);

    if (game.players.length === 0) {
      // Delete empty game
      games.delete(roomCode);
      socket.leave(roomCode);
      return;
    }

    // If host left, assign new host
    if (wasHost && game.players.length > 0) {
      game.players[0].isHost = true;
      io.to(roomCode).emit("host-left", {
        newHost: game.players[0].id,
        newHostName: game.players[0].name,
      });
    }

    // If the leaving player was the current turn, move to next player
    if (wasCurrentTurn && game.players.length > 0) {
      const nextIndex = 0; // Start from first player
      game.currentTurn = game.players[nextIndex].id;
      io.to(roomCode).emit("turn-changed", {
        playerId: game.players[nextIndex].id,
        turnNumber: game.turnNumber,
        maxTurns: game.maxTurns,
      });
    }

    games.set(roomCode, game);
    io.to(roomCode).emit("players-updated", game.players);
    socket.leave(roomCode);

    // Notify the player that they've left
    socket.emit("left-game", { message: "You have left the game" });
  });

  // Start game
  socket.on("start-game", ({ roomCode }: { roomCode: string }) => {
    const game = games.get(roomCode);

    if (game && !game.isGameStarted) {
      game.isGameStarted = true;
      game.turnNumber = 1;
      game.currentTurn = game.players[0].id; // First player goes first
      games.set(roomCode, game);

      // Send the current turn with the game started event
      io.to(roomCode).emit("game-started", {
        currentTurn: game.players[0].id,
        players: game.players,
        turnNumber: game.turnNumber,
        maxTurns: game.maxTurns,
      });
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

      if (!game || !game.isGameStarted) {
        console.log("Game not found or not started");
        return;
      }

      // Check if game is over (reached max turns)
      if (game.turnNumber >= game.maxTurns) {
        io.to(roomCode).emit("game-over", {
          winner: game.gameWinner,
          message: "Game Over! All 12 months completed!",
        });
        return;
      }

      // Find the player
      const playerIndex = game.players.findIndex((p: any) => p.id === playerId);
      if (playerIndex === -1) {
        console.log("Player not found");
        return;
      }

      // Update player position
      const player = game.players[playerIndex];
      const oldPosition = player.position;
      player.position = newPosition;

      console.log(
        `Player ${player.name} moved from ${oldPosition} to ${newPosition}`,
      );

      // Increment turn number
      game.turnNumber += 1;

      // Save updated game
      games.set(roomCode, game);

      // Broadcast dice roll to all players
      io.to(roomCode).emit("dice-rolled", {
        playerId,
        dice1,
        dice2,
        newPosition,
        turnNumber: game.turnNumber,
        maxTurns: game.maxTurns,
      });

      // Check if game is over
      if (game.turnNumber >= game.maxTurns) {
        // Determine winner (player with most money)
        let winner = game.players[0];
        for (const p of game.players) {
          if (p.money > winner.money) {
            winner = p;
          }
        }
        game.gameWinner = winner;
        games.set(roomCode, game);

        io.to(roomCode).emit("game-over", {
          winner: winner,
          message: `Game Over! ${winner.name} wins with K${winner.money}!`,
        });
        return;
      }

      // Move to next turn
      const nextIndex = (playerIndex + 1) % game.players.length;
      const nextPlayer = game.players[nextIndex];
      game.currentTurn = nextPlayer.id;

      games.set(roomCode, game);

      // Broadcast turn change
      io.to(roomCode).emit("turn-changed", {
        playerId: nextPlayer.id,
        turnNumber: game.turnNumber,
        maxTurns: game.maxTurns,
      });
    },
  );

  // Handle disconnection (unexpected disconnection like browser close)
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Remove player from any game they were in
    for (const [roomCode, game] of games.entries()) {
      const playerIndex = game.players.findIndex(
        (p: { id: string }) => p.id === socket.id,
      );

      if (playerIndex !== -1) {
        const wasHost = game.players[playerIndex].isHost;
        const wasCurrentTurn = game.currentTurn === socket.id;

        // Remove player
        game.players.splice(playerIndex, 1);

        if (game.players.length === 0) {
          // Delete empty game
          games.delete(roomCode);
          break;
        }

        // If host left, assign new host
        if (wasHost && game.players.length > 0) {
          game.players[0].isHost = true;
          io.to(roomCode).emit("host-left", {
            newHost: game.players[0].id,
            newHostName: game.players[0].name,
          });
        }

        // If the disconnected player was the current turn, move to next player
        if (wasCurrentTurn && game.players.length > 0) {
          const nextIndex = 0; // Start from first player
          game.currentTurn = game.players[nextIndex].id;
          io.to(roomCode).emit("turn-changed", {
            playerId: game.players[nextIndex].id,
            turnNumber: game.turnNumber,
            maxTurns: game.maxTurns,
          });
        }

        games.set(roomCode, game);
        io.to(roomCode).emit("players-updated", game.players);
        break;
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
