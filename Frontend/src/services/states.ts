import { create } from "zustand";

interface player {
  ID: string;
  setID: (id: string) => void;
  name: string;
  setName: (name: string) => void;
  isHost: boolean;
  setIsHost: (host: boolean) => void;
}

interface game {
  roomCode: string;
  setRoomCode: (code: string) => void;
  players: Array<{ ID: string; name: string; isHost: boolean }>;
  setPlayers: (
    players: Array<{ ID: string; name: string; isHost: boolean }>,
  ) => void;
  isGameStarted: boolean;
  setIsGameStarted: (started: boolean) => void;
}

export const usePlayer = create<player>((set) => ({
  ID: "",
  setID: (id: string) => set({ ID: id }),
  name: "",
  setName: (name: string) => set({ name: name }),
  isHost: false,
  setIsHost: (host: boolean) => set({ isHost: host }),
}));

export const useGame = create<game>((set) => ({
  roomCode: "",
  setRoomCode: (code: string) => set({ roomCode: code }),
  players: [],
  setPlayers: (players) => set({ players }),
  isGameStarted: false,
  setIsGameStarted: (started) => set({ isGameStarted: started }),
}));
