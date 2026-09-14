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
    setTreasury,
    setQli,
    setBoardSpaces,
    setBoardSize,
    setPlayerStyles,
    setProperties,
  } = useGame();
  const { id, setPosition, setIsHost } = usePlayer();

  useEffect(() => {
    const handleBoardConfig = ({ spaces, boardSize, playerStyles }: any) => {
      setBoardSpaces(spaces);
      setBoardSize(boardSize);
      setPlayerStyles(playerStyles);
    };

    const handleGameStarted = ({
      currentTurn,
      players,
      turnNumber,
      maxTurns,
      treasury,
      qli,
      spaces,
      boardSize,
      playerStyles,
      properties,
    }: any) => {
      setPlayers(players);
      setCurrentTurn(currentTurn);
      setTurnNumber(turnNumber);
      setMaxTurns(maxTurns);
      setIsGameStarted(true);
      if (typeof treasury === "number") setTreasury(treasury);
      if (typeof qli === "number") setQli(qli);
      if (spaces) setBoardSpaces(spaces);
      if (boardSize) setBoardSize(boardSize);
      if (playerStyles) setPlayerStyles(playerStyles);
      if (properties) setProperties(properties);
    };

    const handleTaxResolved = ({ players, newTreasury, qli }: any) => {
      setPlayers(players);
      setTreasury(newTreasury);
      if (typeof qli === "number") setQli(qli);
    };

    const handleCardDrawn = ({ players, newTreasury, qli }: any) => {
      setPlayers(players);
      setTreasury(newTreasury);
      if (typeof qli === "number") setQli(qli);
    };

    const handlePropertyResolved = ({
      players,
      properties,
      newTreasury,
      qli,
    }: any) => {
      if (players) setPlayers(players);
      if (properties) setProperties(properties);
      if (typeof newTreasury === "number") setTreasury(newTreasury);
      if (typeof qli === "number") setQli(qli);
    };

    const handleDiceRolled = ({ dice1, dice2, players }: any) => {
      setCurrentDiceRoll([dice1, dice2]);
      if (players) {
        setPlayers(players);
        const currentPlayer = players.find((p: any) => p.id === id);
        if (currentPlayer) setPosition(currentPlayer.position);
      }
    };

    const handleTurnChanged = ({ playerId }: any) => {
      setCurrentTurn(playerId);
    };

    const handlePlayersUpdated = (updatedPlayers: any) => {
      setPlayers(updatedPlayers);

      const currentPlayer = updatedPlayers.find((p: any) => p.id === id);
      if (currentPlayer) {
        setPosition(currentPlayer.position);
        setIsHost(currentPlayer.isHost);
      }
    };

    const handlePlayerJoined = ({ players }: any) => {
      setPlayers(players);
    };

    const handleHostLeft = ({ newHost }: any) => {
      const updated = useGame.getState().players.map((p) => ({
        ...p,
        isHost: p.id === newHost,
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
      treasury,
      qli,
      spaces,
      boardSize,
      playerStyles,
      properties,
    }: any) => {
      setPlayers(players);
      setCurrentTurn(currentTurn);
      setTurnNumber(turnNumber);
      setMaxTurns(maxTurns);
      setIsGameStarted(isGameStarted);
      setIsReconnecting(false);
      if (typeof treasury === "number") setTreasury(treasury);
      if (typeof qli === "number") setQli(qli);
      if (spaces) setBoardSpaces(spaces);
      if (boardSize) setBoardSize(boardSize);
      if (playerStyles) setPlayerStyles(playerStyles);
      if (properties) setProperties(properties);

      const currentPlayer = players.find((p: any) => p.id === playerId);
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

    const handleDisconnect = () => {
      setIsReconnecting(true);
    };
    const handleConnect = () => {
      setIsReconnecting(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("board-config", handleBoardConfig);
    socket.on("game-started", handleGameStarted);
    socket.on("dice-rolled", handleDiceRolled);
    socket.on("turn-changed", handleTurnChanged);
    socket.on("players-updated", handlePlayersUpdated);
    socket.on("player-joined", handlePlayerJoined);
    socket.on("host-left", handleHostLeft);
    socket.on("player-rejoined", handlePlayerRejoined);
    socket.on("rejoin-error", handleRejoinError);
    socket.on("tax-resolved", handleTaxResolved);
    socket.on("card-drawn", handleCardDrawn);
    socket.on("property-resolved", handlePropertyResolved);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("board-config", handleBoardConfig);
      socket.off("game-started", handleGameStarted);
      socket.off("dice-rolled", handleDiceRolled);
      socket.off("turn-changed", handleTurnChanged);
      socket.off("players-updated", handlePlayersUpdated);
      socket.off("player-joined", handlePlayerJoined);
      socket.off("host-left", handleHostLeft);
      socket.off("player-rejoined", handlePlayerRejoined);
      socket.off("rejoin-error", handleRejoinError);
      socket.off("tax-resolved", handleTaxResolved);
      socket.off("card-drawn", handleCardDrawn);
      socket.off("property-resolved", handlePropertyResolved);
    };
  }, [
    id,
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
    setTreasury,
    setQli,
    setBoardSpaces,
    setBoardSize,
    setPlayerStyles,
    setProperties,
  ]);
};
