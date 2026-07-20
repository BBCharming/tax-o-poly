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
    const handleGameStarted = ({
      currentTurn,
      players,
      turnNumber,
      maxTurns,
    }: any) => {
      setPlayers(players);
      setCurrentTurn(currentTurn);
      setTurnNumber(turnNumber);
      setMaxTurns(maxTurns);
      setIsGameStarted(true);
    };

    const handleDiceRolled = ({
      playerId,
      dice1,
      dice2,
      newPosition,
      playerTurnNumber,
    }: any) => {
      setCurrentDiceRoll([dice1, dice2]);

      const updated = useGame
        .getState()
        .players.map((p) =>
          p.ID === playerId
            ? { ...p, position: newPosition, turnNumber: playerTurnNumber }
            : p,
        );
      setPlayers(updated);

      if (playerId === ID) setPosition(newPosition);
    };

    const handleTurnChanged = ({ playerId }: any) => {
      setCurrentTurn(playerId);
    };

    const handlePlayersUpdated = (updatedPlayers: any) => {
      const normalized = updatedPlayers.map((p: any) => ({
        ...p,
        ID: p.ID || p.id,
      }));
      setPlayers(normalized);

      const currentPlayer = normalized.find((p: any) => p.ID === ID);
      if (currentPlayer) setPosition(currentPlayer.position);
    };

    const handlePlayerJoined = ({ players }: any) => {
      setPlayers(players.map((p: any) => ({ ...p, ID: p.ID || p.id })));
    };

    const handleHostLeft = ({ newHost }: any) => {
      const updated = useGame.getState().players.map((p) => ({
        ...p,
        isHost: p.ID === newHost,
      }));
      setPlayers(updated);
    };

    socket.on("game-started", handleGameStarted);
    socket.on("dice-rolled", handleDiceRolled);
    socket.on("turn-changed", handleTurnChanged);
    socket.on("players-updated", handlePlayersUpdated);
    socket.on("player-joined", handlePlayerJoined);
    socket.on("host-left", handleHostLeft);

    return () => {
      socket.off("game-started", handleGameStarted);
      socket.off("dice-rolled", handleDiceRolled);
      socket.off("turn-changed", handleTurnChanged);
      socket.off("players-updated", handlePlayersUpdated);
      socket.off("player-joined", handlePlayerJoined);
      socket.off("host-left", handleHostLeft);
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
