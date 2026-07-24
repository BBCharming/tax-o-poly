import { useEffect } from "react";
import { socket } from "./socket";
import { useGame, usePlayer } from "./states";
import { getLastRoom, setLastRoom, clearPlayerData } from "./utils";
import { toast } from "sonner";

export const useSocketListeners = () => {
  const {
    setPlayers,
    setCurrentTurn,
    setTurnNumber,
    setMaxTurns,
    setIsGameStarted,
    setCurrentDiceRoll,
    setIsReconnecting,
    roomCode,
    setRoomCode,
  } = useGame();
  const { ID, setPosition, setIsHost } = usePlayer();

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
      if (currentPlayer) {
        setPosition(currentPlayer.position);
        setIsHost(currentPlayer.isHost);
      }
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

    const handlePlayerRejoined = ({
      players,
      playerId,
      currentTurn,
      isGameStarted,
      turnNumber,
      maxTurns,
    }: any) => {
      const normalizedPlayers = players.map((p: any) => ({
        ...p,
        ID: p.ID || p.id,
      }));

      setPlayers(normalizedPlayers);
      setCurrentTurn(currentTurn);
      setTurnNumber(turnNumber);
      setMaxTurns(maxTurns);
      setIsGameStarted(isGameStarted);
      setIsReconnecting(false);

      const currentPlayer = normalizedPlayers.find(
        (p: any) => p.ID === playerId,
      );
      if (currentPlayer) {
        setPosition(currentPlayer.position);
        setIsHost(currentPlayer.isHost);

        const storedRoom = getLastRoom();
        if (storedRoom) {
          setRoomCode(storedRoom);
        }
        toast.success(`Rejoined game as ${currentPlayer.name}!`);
      } else {
        console.warn("Current player not found in rejoined data");
      }

      const storedRoom = getLastRoom();
      if (storedRoom) {
        setLastRoom(storedRoom);
      }
    };

    const handleRejoinError = ({ message }: any) => {
      console.error("Rejoin error:", message);
      setIsReconnecting(false);
      toast.error(`Failed to rejoin: ${message}`);

      clearPlayerData();
      window.location.href = "/";
    };

    const handleConnect = () => {
      const lastRoom = getLastRoom();
      const storedName = localStorage.getItem("playerName");
      const storedId = localStorage.getItem("playerId");

      if (lastRoom && storedName && storedId) {
        socket.emit("rejoin-game", {
          roomCode: lastRoom,
          playerId: storedId,
          name: storedName,
        });
      }
    };

    const handleDisconnect = () => {
      setIsReconnecting(true);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("game-started", handleGameStarted);
    socket.on("dice-rolled", handleDiceRolled);
    socket.on("turn-changed", handleTurnChanged);
    socket.on("players-updated", handlePlayersUpdated);
    socket.on("player-joined", handlePlayerJoined);
    socket.on("host-left", handleHostLeft);
    socket.on("player-rejoined", handlePlayerRejoined);
    socket.on("rejoin-error", handleRejoinError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("game-started", handleGameStarted);
      socket.off("dice-rolled", handleDiceRolled);
      socket.off("turn-changed", handleTurnChanged);
      socket.off("players-updated", handlePlayersUpdated);
      socket.off("player-joined", handlePlayerJoined);
      socket.off("host-left", handleHostLeft);
      socket.off("player-rejoined", handlePlayerRejoined);
      socket.off("rejoin-error", handleRejoinError);
    };
  }, [
    ID,
    roomCode,
    setPlayers,
    setCurrentTurn,
    setTurnNumber,
    setMaxTurns,
    setIsGameStarted,
    setCurrentDiceRoll,
    setPosition,
    setIsHost,
    setIsReconnecting,
    setRoomCode,
  ]);
};
