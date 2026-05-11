import { create } from "zustand";

interface playerName {
  playerName: string;
  setPlayerName: (name: string) => void;
}

interface game {
  roomCode: string;
  setRoomCode: (code: string) => void;
}

export const usePlayerName = create<playerName>((set) => ({
  playerName: "",
  setPlayerName: (name: string) => set({ playerName: name }),
}));

export const useGame = create<game>((set) => ({
  roomCode: "",
  setRoomCode: (code: string) => set({ roomCode: code }),
}));
