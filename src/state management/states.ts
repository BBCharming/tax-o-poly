import { create } from "zustand";

interface player {
  ID: number;
  setID: (id: number) => void;
  name: string;
  setName: (name: string) => void;
  isHost: boolean;
  setIsHost: (host: boolean) => void;
}

interface game {
  roomCode: string;
  setRoomCode: (code: string) => void;
}

export const usePlayer = create<player>((set) => ({
  ID: 0,
  setID: (id: number) => set({ ID: id }),
  name: "",
  setName: (name: string) => set({ name: name }),
  isHost: false,
  setIsHost: (host: boolean) => set({ isHost: host }),
}));

export const useGame = create<game>((set) => ({
  roomCode: "",
  setRoomCode: (code: string) => set({ roomCode: code }),
}));
