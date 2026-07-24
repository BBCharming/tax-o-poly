import { io } from "socket.io-client";
import { getPlayerId, getPlayerName, getLastRoom } from "./utils";

const SOCKET_URL = "http://localhost:3001";

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

let isReconnecting = false;

socket.on("connect", () => {
  if (isReconnecting) {
    isReconnecting = false;
    const lastRoom = getLastRoom();
    const playerId = getPlayerId();
    const playerName = getPlayerName();

    if (lastRoom && playerId && playerName) {
      socket.emit("rejoin-game", {
        roomCode: lastRoom,
        playerId: playerId,
        name: playerName,
      });
    }
  }
});

socket.on("disconnect", () => {
  isReconnecting = true;
});

export const joinGameRoom = (
  roomCode: string,
  playerData: { name: string; isHost: boolean },
) => {
  const playerId = getPlayerId();
  socket.emit("join-game", {
    roomCode,
    ...playerData,
    playerId: playerId,
  });
};

export const createGameRoom = (
  roomCode: string,
  playerData: { name: string; isHost: boolean },
) => {
  const playerId = getPlayerId();
  socket.emit("create-game", {
    roomCode,
    ...playerData,
    playerId: playerId,
  });
};

export const rejoinGame = (
  roomCode: string,
  playerId: string,
  name: string,
) => {
  socket.emit("rejoin-game", { roomCode, playerId, name });
};

export const startGame = (roomCode: string) => {
  socket.emit("start-game", { roomCode });
};

export const rollDice = (roomCode: string, playerId: string) => {
  socket.emit("roll-dice", { roomCode, playerId });
};

export const leaveGame = (roomCode: string) => {
  socket.emit("leave-game", { roomCode });
  localStorage.removeItem("lastRoom");
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export const reconnectSocket = () => {
  socket.connect();
};
