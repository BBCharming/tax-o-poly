import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001"; // Your backend server URL
export const socket = io(SOCKET_URL);

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
