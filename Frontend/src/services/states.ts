import { create } from "zustand";
import { getPlayerId, getPlayerName } from "./utils";

export interface Player {
  id: string;
  ID: string;
  name: string;
  isHost: boolean;
  position: number;
  money: number;
  token: string;
  color: string;
  turnNumber: number;
}

interface player {
  id: string;
  ID: string;
  setID: (id: string) => void;
  name: string;
  setName: (name: string) => void;
  isHost: boolean;
  setIsHost: (host: boolean) => void;
  position: number;
  setPosition: (position: number) => void;
  money: number;
  setMoney: (money: number) => void;
  initializeFromStorage: () => void;
}

interface game {
  roomCode: string;
  setRoomCode: (code: string) => void;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  isGameStarted: boolean;
  setIsGameStarted: (started: boolean) => void;
  currentTurn: string;
  setCurrentTurn: (playerId: string) => void;
  currentDiceRoll: number[];
  setCurrentDiceRoll: (roll: number[]) => void;
  turnNumber: number;
  setTurnNumber: (turn: number) => void;
  maxTurns: number;
  setMaxTurns: (max: number) => void;
  isReconnecting: boolean;
  setIsReconnecting: (reconnecting: boolean) => void;
}

export const usePlayer = create<player>((set) => ({
  id: "",
  ID: "",
  setID: (id: string) => set({ ID: id, id: id }),
  name: "",
  setName: (name: string) => set({ name: name }),
  isHost: false,
  setIsHost: (host: boolean) => set({ isHost: host }),
  position: 0,
  setPosition: (position: number) => set({ position }),
  money: 1500,
  setMoney: (money: number) => set({ money }),
  initializeFromStorage: () => {
    const storedId = getPlayerId();
    const storedName = getPlayerName();
    set({
      ID: storedId,
      id: storedId,
      name: storedName || "",
    });
  },
}));

export const useGame = create<game>((set) => ({
  roomCode: "",
  setRoomCode: (code: string) => set({ roomCode: code }),
  players: [],
  setPlayers: (players) => set({ players }),
  isGameStarted: false,
  setIsGameStarted: (started) => set({ isGameStarted: started }),
  currentTurn: "",
  setCurrentTurn: (playerId) => set({ currentTurn: playerId }),
  currentDiceRoll: [],
  setCurrentDiceRoll: (roll) => set({ currentDiceRoll: roll }),
  turnNumber: 1,
  setTurnNumber: (turn) => set({ turnNumber: turn }),
  maxTurns: 12,
  setMaxTurns: (max) => set({ maxTurns: max }),
  isReconnecting: false,
  setIsReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),
}));
