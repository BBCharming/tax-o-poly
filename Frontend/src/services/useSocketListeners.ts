// src/services/useSocketListeners.ts
import { useEffect } from "react";
import { socket } from "./socket";
import { useGame, usePlayer } from "./states";

export const useSocketListeners = () => {
  const {
    setPlayers,
    setCurrentTurn,
    setTurnNumber,
    setMaxTurns,
    setIsGameStarted,
    setCurrentDiceRoll,
  } = useGame();
  const { ID, setPosition } = usePlayer();

  useEffect(() => {
    socket.on(
      "game-started",
      ({ currentTurn, players, turnNumber, maxTurns }) => {
        setPlayers(players);
        setCurrentTurn(currentTurn);
        setTurnNumber(turnNumber);
        setMaxTurns(maxTurns);
        setIsGameStarted(true);
      },
    );

    socket.on("turn-changed", ({ playerId, turnNumber }) => {
      setCurrentTurn(playerId);
      setTurnNumber(turnNumber);
    });

    socket.on(
      "dice-rolled",
      ({ playerId, dice1, dice2, newPosition, turnNumber }) => {
        setCurrentDiceRoll([dice1, dice2]);
        setTurnNumber(turnNumber);

        const updated = useGame
          .getState()
          .players.map((p) =>
            p.ID === playerId ? { ...p, position: newPosition } : p,
          );
        setPlayers(updated);

        if (playerId === ID) setPosition(newPosition);
      },
    );

    socket.on("players-updated", (updatedPlayers) => {
      const normalized = updatedPlayers.map((p: any) => ({
        ...p,
        ID: p.ID || p.id,
      }));
      setPlayers(normalized);

      const currentPlayer = normalized.find((p: any) => p.ID === ID);
      if (currentPlayer) setPosition(currentPlayer.position);
    });

    socket.on("player-joined", ({ players }) => {
      setPlayers(players.map((p: any) => ({ ...p, ID: p.ID || p.id })));
    });

    socket.on("host-left", ({ newHost }) => {
      const updated = useGame.getState().players.map((p) => ({
        ...p,
        isHost: p.ID === newHost,
      }));
      setPlayers(updated);
    });

    return () => {
      socket.off("game-started");
      socket.off("turn-changed");
      socket.off("dice-rolled");
      socket.off("players-updated");
      socket.off("player-joined");
      socket.off("host-left");
    };
  }, [
    ID,
    setPlayers,
    setCurrentTurn,
    setTurnNumber,
    setMaxTurns,
    setIsGameStarted,
    setCurrentDiceRoll,
    setPosition,
  ]);
};
