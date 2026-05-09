import { create } from "zustand";

interface playerName {
  playerName: string;
  setPlayerName: (name: string) => void;
}

export const usePlayerName = create<playerName>((set) => ({
  playerName: "",
  setPlayerName: (name: string) => set({ playerName: name }),
}));
