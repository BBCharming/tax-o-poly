import { create } from "zustand";
import { getPlayerId, getPlayerName } from "./utils";

export interface PlayerStyle {
  token: string;
  bg: string;
  border: string;
  text: string;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  position: number;
  money: number;
  style?: PlayerStyle;
  turnNumber: number;
  underDeclareCount?: number;
  auditedCount?: number;
}

export interface BoardSpace {
  name: string;
  color: string;
  price?: string;
  kind?: "corner" | "income-tax" | "civic-risk" | "public-good";
}

interface player {
  id: string;
  setId: (id: string) => void;
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
  treasury: number;
  setTreasury: (treasury: number) => void;
  qli: number;
  setQli: (qli: number) => void;
  boardSpaces: BoardSpace[];
  setBoardSpaces: (spaces: BoardSpace[]) => void;
  boardSize: number;
  setBoardSize: (size: number) => void;
  playerStyles: PlayerStyle[];
  setPlayerStyles: (styles: PlayerStyle[]) => void;
}

export const usePlayer = create<player>((set) => ({
  id: "",
  setId: (id: string) => set({ id }),
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
  treasury: 4250,
  setTreasury: (treasury) => set({ treasury }),
  qli: 50,
  setQli: (qli) => set({ qli }),
  boardSpaces: [],
  setBoardSpaces: (boardSpaces) => set({ boardSpaces }),
  boardSize: 36,
  setBoardSize: (boardSize) => set({ boardSize }),
  playerStyles: [],
  setPlayerStyles: (playerStyles) => set({ playerStyles }),
}));
