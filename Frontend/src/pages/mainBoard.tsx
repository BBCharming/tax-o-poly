import { useEffect, useRef, useState } from "react";
import { useGame, usePlayer } from "../services/states";
import { socket, rollDice, leaveGame, declareTax } from "../services/socket";
import { useNavigate } from "react-router";
import { toast } from "sonner";

//This is how long the public good/civic risk banner must stay on the page
const CARD_MODAL_MIN_SECONDS = 6;

export default function GameBoard() {
  const navigate = useNavigate();
  const {
    players,
    currentTurn,
    currentDiceRoll,
    setPlayers,
    setCurrentTurn,
    setIsGameStarted,
    roomCode,
    isGameStarted,
    setTurnNumber,
    setCurrentDiceRoll,
    maxTurns,
    treasury,
    qli,
    boardSpaces,
    playerStyles,
  } = useGame();
  const { id: myId, position, setPosition, setIsHost, setName } = usePlayer();
  const playerRound = players.find((p) => p.id === myId)?.turnNumber ?? 1;
  const [isRolling, setIsRolling] = useState(false);
  const [movingPlayer, setMovingPlayer] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<{
    winner: any;
    message: string;
  } | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [awaitingDeclaration, setAwaitingDeclaration] = useState(false);
  const [taxResult, setTaxResult] = useState<{
    audited: boolean;
    penalty: number;
  } | null>(null);
  const [cardBanner, setCardBanner] = useState<{
    type: "CivicRisk" | "PublicGood";
    description: string;
  } | null>(null);
  const [cardCountdown, setCardCountdown] = useState(0);
  const cardCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get space colors
  const getSpaceColors = (color: string) => {
    switch (color) {
      case "teal":
        return {
          bg: "bg-[rgb(8,80,65)]",
          text: "text-[rgb(93,202,165)]",
          border: "border-[rgb(93,202,165)]",
          priceText: "text-[rgb(159,225,203)]",
          colorBar: "bg-[rgb(93,202,165)]",
        };
      case "green":
        return {
          bg: "bg-[rgb(39,80,10)]",
          text: "text-[rgb(151,196,89)]",
          border: "border-[rgb(151,196,89)]",
          priceText: "text-[rgb(192,221,151)]",
          colorBar: "bg-[rgb(151,196,89)]",
        };
      case "blue":
        return {
          bg: "bg-[rgb(12,68,124)]",
          text: "text-[rgb(133,183,235)]",
          border: "border-[rgb(133,183,235)]",
          priceText: "text-[rgb(181,212,244)]",
          colorBar: "bg-[rgb(133,183,235)]",
        };
      case "orange":
        return {
          bg: "bg-[rgb(99,56,6)]",
          text: "text-[rgb(239,159,39)]",
          border: "border-[rgb(239,159,39)]",
          priceText: "text-[rgb(239,159,39)]",
          colorBar: "bg-[rgb(239,159,39)]",
        };
      case "red":
        return {
          bg: "bg-[rgb(121,31,31)]",
          text: "text-[rgb(240,149,149)]",
          border: "border-[rgb(240,149,149)]",
          priceText: "text-[rgb(240,149,149)]",
          colorBar: "bg-[rgb(240,149,149)]",
        };
      case "brown":
        return {
          bg: "bg-[rgb(113,43,19)]",
          text: "text-[rgb(240,153,123)]",
          border: "border-[rgb(240,153,123)]",
          priceText: "text-[rgb(240,153,123)]",
          colorBar: "bg-[rgb(240,153,123)]",
        };
      case "gray":
        return {
          bg: "bg-[rgb(68,68,65)]",
          text: "text-[rgb(180,178,169)]",
          border: "border-[rgb(180,178,169)]",
          priceText: "text-[rgb(180,178,169)]",
          colorBar: "bg-[rgb(180,178,169)]",
        };
      default:
        return {
          bg: "bg-slate-700",
          text: "text-gray-300",
          border: "border-gray-400",
          priceText: "text-gray-300",
          colorBar: "bg-gray-400",
        };
    }
  };

  useEffect(() => {
    const handleDiceRolled = ({ playerId }: any) => {
      setMovingPlayer(playerId);
      setIsRolling(false);
      setTimeout(() => setMovingPlayer(null), 600);
    };

    const handleHostLeft = ({ newHostName }: any) => {
      toast.info(`${newHostName} is now the new host!`);
    };

    const handleGameOver = ({ winner, message }: any) => {
      setGameOver({ winner, message });
    };

    const handleTaxPrompt = ({ playerId }: any) => {
      if (playerId === myId) {
        setShowTaxModal(true);
      }
      setAwaitingDeclaration(true);
    };

    const handleTaxResolved = ({ playerId, audited, penalty }: any) => {
      if (playerId === myId) {
        setTaxResult({ audited, penalty });
        setShowTaxModal(false);
        setTimeout(() => setTaxResult(null), 3500);
      }
      setAwaitingDeclaration(false);
      setIsRolling(false);
    };

    const handleCardDrawn = ({ type, description }: any) => {
      setCardBanner({ type, description });
      setCardCountdown(CARD_MODAL_MIN_SECONDS);
    };

    socket.on("dice-rolled", handleDiceRolled);
    socket.on("host-left", handleHostLeft);
    socket.on("game-over", handleGameOver);
    socket.on("tax-prompt", handleTaxPrompt);
    socket.on("tax-resolved", handleTaxResolved);
    socket.on("card-drawn", handleCardDrawn);

    return () => {
      socket.off("dice-rolled", handleDiceRolled);
      socket.off("host-left", handleHostLeft);
      socket.off("game-over", handleGameOver);
      socket.off("tax-prompt", handleTaxPrompt);
      socket.off("tax-resolved", handleTaxResolved);
      socket.off("card-drawn", handleCardDrawn);
    };
  }, [myId]);

  useEffect(() => {
    if (!cardBanner) {
      if (cardCountdownRef.current) {
        clearInterval(cardCountdownRef.current);
        cardCountdownRef.current = null;
      }
      return;
    }

    cardCountdownRef.current = setInterval(() => {
      setCardCountdown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => {
      if (cardCountdownRef.current) {
        clearInterval(cardCountdownRef.current);
        cardCountdownRef.current = null;
      }
    };
  }, [cardBanner]);

  const handleDismissCard = () => {
    if (cardCountdown > 0) return;
    setCardBanner(null);
  };

  const handleRollDice = () => {
    if (
      isRolling ||
      currentTurn !== myId ||
      !isGameStarted ||
      gameOver ||
      awaitingDeclaration
    )
      return;
    setIsRolling(true);
    rollDice(roomCode, myId);
  };

  const handleDeclare = (choice: "full" | "under") => {
    declareTax(roomCode, myId, choice);
  };

  const handleQuitGame: any = () => {
    if (roomCode) {
      leaveGame(roomCode);
    }

    setPlayers([]);
    setCurrentTurn("");
    setIsGameStarted(false);
    setTurnNumber(0);
    setPosition(0);
    setIsHost(false);
    setName("");
    setCurrentDiceRoll([]);
    setGameOver(null);

    navigate("/");
    toast.info("You have left the game");
  };

  const handleQuitClick = () => {
    setShowQuitConfirm(true);
  };

  const handleConfirmQuit = () => {
    setShowQuitConfirm(false);
    handleQuitGame();
  };

  const handleCancelQuit = () => {
    setShowQuitConfirm(false);
  };

  const getPlayerStyle = (player: any) => {
    return (
      player.style ||
      playerStyles[0] || {
        token: "🎲",
        bg: "bg-gray-500",
        border: "border-gray-600",
        text: "text-gray-500",
      }
    );
  };

  const renderPlayerTokens = (spaceIndex: number) => {
    const playersOnSpace = players.filter((p) => p.position === spaceIndex);

    return playersOnSpace.map((player, idx) => {
      const style = getPlayerStyle(player);
      const isCurrentPlayer = player.id === myId;
      const isMoving = movingPlayer === player.id;

      return (
        <div
          key={player.id}
          className={`absolute ${style.bg} ${style.border} border-2 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold transition-all duration-500 ease-in-out`}
          style={{
            bottom: `${idx * 18 + 2}px`,
            right: `${idx * 18 + 2}px`,
            zIndex: isCurrentPlayer ? 10 : 5,
            transform: isMoving
              ? "scale(1.5)"
              : isCurrentPlayer
                ? "scale(1.2)"
                : "scale(1)",
            boxShadow: isMoving
              ? "0 0 20px rgba(255,215,0,0.8)"
              : isCurrentPlayer
                ? "0 0 10px rgba(255,255,0,0.5)"
                : "none",
            transition: "all 0.5s ease-in-out",
          }}
        >
          <span className="text-xs">{style.token}</span>
        </div>
      );
    });
  };

  const renderSpace = (
    space: any,
    spaceIndex: number = -1,
    isCorner = false,
    isSide = false,
  ) => {
    const colors = getSpaceColors(space.color);

    if (isCorner) {
      return (
        <div
          className={`${colors.bg} ${colors.border} border-2 flex items-center justify-center shrink-0 relative`}
          style={{ width: "120px", height: "120px" }}
        >
          <div className={`${colors.text} font-bold text-center px-2 text-sm`}>
            {space.name}
          </div>
          {spaceIndex >= 0 && renderPlayerTokens(spaceIndex)}
        </div>
      );
    }

    return (
      <div
        className={`bg-white border border-gray-300 flex flex-col shrink-0 relative ${isSide ? "" : "w-full"}`}
        style={{
          width: isSide ? "80px" : undefined,
          height: "120px",
        }}
      >
        {!space.color.includes("gray") && !space.color.includes("orange") && (
          <div className={`${colors.colorBar} h-6`}></div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center p-1">
          <div
            className={`text-xs text-center font-semibold ${space.color === "orange" ? colors.text : "text-gray-800"}`}
          >
            {space.name}
          </div>
          {space.price && (
            <div className="text-xs text-gray-600 font-bold mt-1">
              {space.price}
            </div>
          )}
        </div>
        {spaceIndex >= 0 && renderPlayerTokens(spaceIndex)}
      </div>
    );
  };

  const currentPlayerName =
    players.find((p) => p.id === currentTurn)?.name || "Waiting...";

  if (boardSpaces.length < 36) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#F7F1E6] via-[#EFE7D8] to-[#E4EEF3] flex items-center justify-center">
        <p className="text-[rgb(47,111,159)] text-lg font-semibold">
          Loading board...
        </p>
      </div>
    );
  }

  const corners = {
    topLeft: boardSpaces[0],
    topRight: boardSpaces[9],
    bottomRight: boardSpaces[18],
    bottomLeft: boardSpaces[27],
  };
  const topSpaces = boardSpaces.slice(1, 9);
  const rightSpaces = boardSpaces.slice(10, 18);
  const bottomSpaces = boardSpaces.slice(19, 27).slice().reverse();
  const leftSpaces = boardSpaces.slice(28, 36).slice().reverse();

  if (gameOver) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#F7F1E6] via-[#EFE7D8] to-[#E4EEF3] p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-3xl font-bold text-center text-red-600 mb-4">
            🏆 Game Over!
          </h2>
          <div className="text-center mb-6">
            <p className="text-xl font-semibold text-gray-800">
              {gameOver.message}
            </p>
            {gameOver.winner && (
              <div className="mt-4 p-4 bg-[rgb(250,246,237)] rounded-lg border-2 border-[rgb(47,111,159)]">
                <p className="text-lg font-bold text-[rgb(47,111,159)]">
                  Winner: {gameOver.winner.name}
                </p>
                <p className="text-md text-gray-600">
                  Money: K{gameOver.winner.money}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[rgb(47,111,159)] hover:bg-[rgb(37,90,130)] text-white font-bold py-3 rounded-lg transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#F7F1E6] via-[#EFE7D8] to-[#E4EEF3] p-4 flex items-center justify-center">
      <div className="relative w-full max-w-6xl">
        {/* Top Bar */}
        <div className="bg-[rgb(47,111,159)] rounded-t-xl px-6 py-3 mb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="text-[rgb(250,249,245)] font-medium text-sm">
                Public treasury
              </span>
              <span className="text-[rgb(250,249,245)] font-medium text-sm">
                K {treasury.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[rgb(250,249,245)] font-medium text-sm">
                Month:
              </span>
              <span className="text-white font-bold">
                {playerRound}/{maxTurns}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[rgb(250,249,245)] font-medium text-sm">
                Current Turn:
              </span>
              <span className="text-white font-bold">{currentPlayerName}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[rgb(250,249,245)] font-medium text-sm">
                Quality-of-Life Index
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-3 bg-[rgb(38,38,36)] rounded-full border border-[rgba(222,220,209,0.3)]">
                  <div
                    className="h-full bg-[rgb(70,150,190)] rounded-full transition-all duration-500"
                    style={{ width: `${qli}%` }}
                  ></div>
                </div>
                <span className="text-[rgb(194,192,182)] text-sm">{qli}%</span>
              </div>
            </div>

            {/* Quit Button */}
            <button
              onClick={handleQuitClick}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm cursor-pointer"
            >
              Quit Game
            </button>
          </div>
        </div>

        {/* Main Board with Side Panel */}
        <div className="flex gap-4">
          {/* Game Board */}
          <div className="flex-1 bg-[rgb(250,246,237)] border-8 border-[rgb(51,49,44)] shadow-2xl">
            <div className="w-full flex flex-col">
              {/* Top Row */}
              <div className="flex w-full">
                {renderSpace(corners.topLeft, 0, true)}
                <div className="flex flex-1">
                  {topSpaces.map((space, idx) => (
                    <div key={idx} className="flex-1">
                      {renderSpace(space, idx + 1)}
                    </div>
                  ))}
                </div>
                {renderSpace(corners.topRight, 9, true)}
              </div>

              {/* Middle Section */}
              <div className="flex flex-1">
                {/* Left Column */}
                <div
                  className="flex flex-col shrink-0"
                  style={{ width: "120px" }}
                >
                  {leftSpaces.map((space, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-center"
                      style={{ height: "80px" }}
                    >
                      <div className="transform -rotate-90 origin-center">
                        {renderSpace(space, 35 - idx, false, true)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Center Area */}
                <div className="flex-1 bg-[rgb(235,244,250)] flex flex-col items-center justify-center p-8">
                  <div className="bg-linear-to-r from-[#2F6F9F] to-[#1F4E73] px-12 py-6 rounded-xl shadow-xl mb-6 border-4 border-white">
                    <h1 className="text-6xl font-black text-white tracking-wider text-center">
                      TAX-OPOLY
                    </h1>
                    <p className="text-white text-center text-lg font-semibold mt-2">
                      The Public Good Game
                    </p>
                  </div>

                  <div className="text-sm text-gray-600 bg-white/80 px-4 py-2 rounded-lg mb-4">
                    Your position: {position}
                  </div>

                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/80 rounded-xl p-6 shadow-lg">
                      <h3 className="text-gray-800 font-semibold text-center mb-4">
                        Players in Game
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                        {players.map((player) => {
                          const style = getPlayerStyle(player);
                          const isCurrentPlayer = player.id === myId;
                          const isTurn = player.id === currentTurn;

                          return (
                            <div
                              key={player.id}
                              className={`flex items-center justify-between px-4 py-2 rounded-lg ${
                                isCurrentPlayer
                                  ? "bg-blue-50 border-2 border-blue-300"
                                  : "bg-gray-50"
                              } ${isTurn ? "ring-2 ring-[rgb(47,111,159)]" : ""}`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`${style.bg} rounded-full w-8 h-8 flex items-center justify-center text-white`}
                                >
                                  <span className="text-sm">{style.token}</span>
                                </div>
                                <span className="font-medium text-gray-800">
                                  {player.name}
                                  {isCurrentPlayer && " (You)"}
                                  {player.isHost && " 👑"}

                                  {(player.auditedCount ?? 0) > 0 ? (
                                    <span
                                      className="ml-2 text-xs text-[rgb(140,43,43)]"
                                      title={`Audited ${player.auditedCount} time(s)`}
                                    >
                                      🚩×{player.auditedCount}
                                    </span>
                                  ) : (
                                    <span
                                      className="ml-2 text-xs text-[rgb(47,111,159)]"
                                      title="No audits so far"
                                    >
                                      🛡️
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isTurn && (
                                  <span className="text-xs bg-[rgb(47,111,159)] text-white px-2 py-1 rounded-full">
                                    Turn
                                  </span>
                                )}
                                <span className="text-sm text-gray-600">
                                  Month {player.turnNumber}/{maxTurns} · K{" "}
                                  {player.money || 1500}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-white/80 rounded-xl p-6 shadow-lg">
                      <div className="flex gap-4">
                        <button
                          onClick={handleRollDice}
                          disabled={
                            isRolling ||
                            currentTurn !== myId ||
                            !isGameStarted ||
                            gameOver !== null ||
                            awaitingDeclaration
                          }
                          className={`bg-[rgb(47,111,159)] hover:bg-[rgb(37,90,130)] text-white font-bold px-8 py-3 rounded-lg shadow-lg transition-colors ${
                            isRolling ||
                            currentTurn !== myId ||
                            !isGameStarted ||
                            gameOver !== null ||
                            awaitingDeclaration
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {awaitingDeclaration
                            ? "📋 Declare your tax..."
                            : isRolling
                              ? "🎲 Rolling..."
                              : "🎲 ROLL DICE"}
                        </button>
                        {currentDiceRoll.length > 0 && (
                          <div className="bg-[rgb(250,246,237)] px-6 py-3 rounded-lg shadow-lg border-2 border-[rgb(47,111,159)]">
                            <div className="text-[rgb(47,111,159)] text-xs text-center font-semibold">
                              Last roll
                            </div>
                            <div className="text-[rgb(51,49,44)] font-bold text-lg text-center">
                              {currentDiceRoll[0]} + {currentDiceRoll[1]}
                            </div>
                          </div>
                        )}
                      </div>
                      {!isGameStarted && (
                        <p className="text-sm text-[rgb(47,111,159)] mt-2 font-semibold">
                          ⏳ Waiting for host to start the game...
                        </p>
                      )}
                      {isGameStarted && (
                        <p className="text-sm text-gray-600 mt-2">
                          Month {playerRound}/{maxTurns}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div
                  className="flex flex-col shrink-0"
                  style={{ width: "120px" }}
                >
                  {rightSpaces.map((space, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-center"
                      style={{ height: "80px" }}
                    >
                      <div className="transform rotate-90 origin-center">
                        {renderSpace(space, 10 + idx, false, true)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex w-full">
                {renderSpace(corners.bottomLeft, 27, true)}
                <div className="flex flex-1">
                  {bottomSpaces.map((space, idx) => (
                    <div key={idx} className="flex-1">
                      {renderSpace(space, 26 - idx)}
                    </div>
                  ))}
                </div>
                {renderSpace(corners.bottomRight, 18, true)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Declaration Modal*/}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-[rgb(191,216,232)]">
            <h2 className="text-2xl font-bold text-center text-[rgb(47,111,159)] mb-2">
              📋 Income Tax
            </h2>
            <p className="text-[rgb(51,49,44)] text-center mb-6">
              You landed on Income Tax. Declare your income in full to
              contribute more to the Public Treasury with no risk — or
              under-declare to keep more for yourself, with a chance of being
              audited.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDeclare("full")}
                className="w-full bg-[rgb(47,111,159)] hover:bg-[rgb(37,90,130)] text-white font-bold py-3 rounded-lg transition-colors"
              >
                Declare Full Income (K100 → Treasury)
              </button>
              <button
                onClick={() => handleDeclare("under")}
                className="w-full bg-white border-2 border-[rgb(47,111,159)] text-[rgb(47,111,159)] font-bold py-3 rounded-lg hover:bg-[rgb(233,242,248)] transition-colors"
              >
                Under-declare (K40 → Treasury, audit risk)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax outcome banner */}
      {taxResult && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`px-6 py-4 rounded-xl shadow-2xl border-2 font-semibold text-center ${
              taxResult.audited
                ? "bg-white border-[rgb(140,43,43)] text-[rgb(140,43,43)]"
                : "bg-white border-[rgb(47,111,159)] text-[rgb(47,111,159)]"
            }`}
          >
            {taxResult.audited
              ? `🔍 Audited! You paid an extra K${taxResult.penalty} penalty and lose your next turn.`
              : "✅ Declaration accepted — no audit this time."}
          </div>
        </div>
      )}

      {cardBanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className={`bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 ${
              cardBanner.type === "CivicRisk"
                ? "border-[rgb(140,43,43)]"
                : "border-[rgb(47,111,159)]"
            }`}
          >
            <h2
              className={`text-2xl font-bold text-center mb-4 ${
                cardBanner.type === "CivicRisk"
                  ? "text-[rgb(140,43,43)]"
                  : "text-[rgb(47,111,159)]"
              }`}
            >
              {cardBanner.type === "CivicRisk"
                ? "⚠️ Civic Risk"
                : "🎁 Public Good"}
            </h2>
            <p className="text-[rgb(51,49,44)] text-center mb-6">
              {cardBanner.description}
            </p>
            <button
              onClick={handleDismissCard}
              disabled={cardCountdown > 0}
              className={`w-full font-bold py-3 rounded-lg transition-colors ${
                cardCountdown > 0
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : cardBanner.type === "CivicRisk"
                    ? "bg-[rgb(140,43,43)] hover:bg-[rgb(120,35,35)] text-white cursor-pointer"
                    : "bg-[rgb(47,111,159)] hover:bg-[rgb(37,90,130)] text-white cursor-pointer"
              }`}
            >
              {cardCountdown > 0 ? `Got it (${cardCountdown}s)` : "Got it"}
            </button>
          </div>
        </div>
      )}

      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-center text-red-600 mb-4">
              ⚠️ Quit Game?
            </h2>
            <p className="text-gray-700 text-center mb-6">
              Are you sure you want to leave the game? You will be disconnected
              and will need to rejoin with a new room code.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleCancelQuit}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmQuit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Yes, Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
