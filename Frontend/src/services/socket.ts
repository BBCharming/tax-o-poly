import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001";
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
});

export const joinGameRoom = (
  roomCode: string,
  playerData: { ID: string; name: string; isHost: boolean },
) => {
  socket.emit("join-game", { roomCode, ...playerData });
};

export const createGameRoom = (
  roomCode: string,
  playerData: { ID: string; name: string; isHost: boolean },
) => {
  socket.emit("create-game", { roomCode, ...playerData });
};

export const startGame = (roomCode: string) => {
  socket.emit("start-game", { roomCode });
};

export const rollDice = (
  roomCode: string,
  playerId: string,
  dice1: number,
  dice2: number,
  newPosition: number,
) => {
  socket.emit("roll-dice", { roomCode, playerId, dice1, dice2, newPosition });
};

export const leaveGame = (roomCode: string) => {
  socket.emit("leave-game", { roomCode });
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export const reconnectSocket = () => {
  socket.connect();
};
