import { useEffect, useState } from "react";
import { useGame, usePlayer } from "../services/states";
import { playerColors, playerTokens } from "../services/playerConfigs";
import { socket, rollDice, leaveGame, declareTax } from "../services/socket";
import { useNavigate } from "react-router";
import { toast } from "sonner";

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
  } = useGame();
  const { ID, position, setPosition, setIsHost, setName } = usePlayer();
  const playerRound = players.find((p) => p.ID === ID)?.turnNumber ?? 1;
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

  const corners = {
    topLeft: { name: "GO", color: "gray" },
    topRight: { name: "Free Parking", color: "gray" },
    bottomLeft: { name: "Tax Office", color: "gray" },
    bottomRight: { name: "Audit Lock!", color: "red" },
  };

  const topSpaces = [
    { name: "Airport", price: "K260", color: "blue" },
    { name: "Civic Risk", color: "orange" },
    { name: "Court", price: "K220", color: "teal" },
    { name: "Fire Station", price: "K200", color: "teal" },
    { name: "Income Tax", color: "gray" },
    { name: "University", price: "K180", color: "green" },
    { name: "Public Good", color: "orange" },
    { name: "Stadium", price: "K160", color: "green" },
  ];

  const rightSpaces = [
    { name: "Clinic", price: "K120", color: "blue" },
    { name: "School", price: "K160", color: "green" },
    { name: "Civic Risk", color: "orange" },
    { name: "Mine", price: "K200", color: "brown" },
    { name: "Factory", price: "K180", color: "brown" },
    { name: "Public Good", color: "orange" },
    { name: "Income Tax", color: "gray" },
    { name: "Port", price: "K240", color: "blue" },
  ];

  const bottomSpaces = [
    { name: "Sewer", price: "K100", color: "teal" },
    { name: "Park", price: "K140", color: "green" },
    { name: "Civic Risk", color: "orange" },
    { name: "Market", price: "K180", color: "green" },
    { name: "Library", price: "K160", color: "green" },
    { name: "Income Tax", color: "gray" },
    { name: "Public Good", color: "orange" },
    { name: "Bridge", price: "K220", color: "blue" },
  ];

  const leftSpaces = [
    { name: "Police", price: "K120", color: "teal" },
    { name: "Water", price: "K175", color: "teal" },
    { name: "Public Good", color: "orange" },
    { name: "Income Tax", color: "gray" },
    { name: "School", price: "K150", color: "green" },
    { name: "Civic Risk", color: "orange" },
    { name: "Hospital", price: "K200", color: "teal" },
    { name: "Free Pass", color: "gray" },
  ];

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

    // Only the player who landed on Income Tax receives this (server
    // targets it with io.to(player.socketId)), so no playerId check needed.
    // Broadcast to the room, but only the player who actually landed
    // on Income Tax should see the modal — everyone else just needs to
    // silently know a declaration is pending (handled by disabling the
    // roll button for the whole room via awaitingDeclaration below).
    const handleTaxPrompt = ({ playerId }: any) => {
      if (playerId === ID) {
        setShowTaxModal(true);
      }
      setAwaitingDeclaration(true);
    };

    const handleTaxResolved = ({ playerId, audited, penalty }: any) => {
      if (playerId === ID) {
        setTaxResult({ audited, penalty });
        setShowTaxModal(false);
        setTimeout(() => setTaxResult(null), 3500);
      }
      setAwaitingDeclaration(false);
      setIsRolling(false);
    };

    const handleCardDrawn = ({ type, description }: any) => {
      setCardBanner({ type, description });
      setTimeout(() => setCardBanner(null), 4000);
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
  }, [ID]);

  const handleRollDice = () => {
    if (
      isRolling ||
      currentTurn !== ID ||
      !isGameStarted ||
      gameOver ||
      awaitingDeclaration
    )
      return;
    setIsRolling(true);
    rollDice(roomCode, ID);
  };

  const handleDeclare = (choice: "full" | "under") => {
    declareTax(roomCode, ID, choice);
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
    const tokenIndex = playerTokens.indexOf(player.token);
    const colorIndex = tokenIndex >= 0 ? tokenIndex : 0;
    const color = playerColors[colorIndex % playerColors.length];
    return { ...color, token: player.token || playerTokens[0] };
  };

  const renderPlayerTokens = (spaceIndex: number) => {
    const playersOnSpace = players.filter((p) => p.position === spaceIndex);

    return playersOnSpace.map((player, idx) => {
      const style = getPlayerStyle(player);
      const isCurrentPlayer = player.ID === ID;
      const isMoving = movingPlayer === player.ID;

      return (
        <div
          key={player.ID}
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
    players.find((p) => (p.ID || p.id) === currentTurn)?.name || "Waiting...";

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
              {/*
                Board ring layout (36 spaces total, matches server BOARD_SIZE):
                0            = topLeft corner (GO)
                1-8          = topSpaces, left -> right
                9            = topRight corner (Free Parking)
                10-17        = rightSpaces, top -> bottom
                18           = bottomRight corner (Audit Lock!)
                19-26        = bottomSpaces, right -> left (26-idx)
                27           = bottomLeft corner (Tax Office)
                28-35        = leftSpaces, bottom -> top (35-idx)
                (35 -> wraps back to 0)
              */}

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
                          const isCurrentPlayer = player.ID === ID;
                          const isTurn = player.ID === currentTurn;

                          return (
                            <div
                              key={player.ID}
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
                                  {/* Compliance visibility: makes each player's tax
                                      history visible to the whole group, since social
                                      visibility (not just individual penalties) is what
                                      sustains cooperation in public-goods settings. */}
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
                            currentTurn !== ID ||
                            !isGameStarted ||
                            gameOver !== null ||
                            awaitingDeclaration
                          }
                          className={`bg-[rgb(47,111,159)] hover:bg-[rgb(37,90,130)] text-white font-bold px-8 py-3 rounded-lg shadow-lg transition-colors ${
                            isRolling ||
                            currentTurn !== ID ||
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

      {/* Tax Declaration Modal — only the player who landed on Income Tax sees this */}
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

      {/* Tax outcome banner — shown briefly after resolution */}
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

      {/* Civic Risk / Public Good card banner */}
      {cardBanner && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`px-6 py-4 rounded-xl shadow-2xl border-2 font-semibold text-center max-w-md ${
              cardBanner.type === "CivicRisk"
                ? "bg-white border-[rgb(140,43,43)] text-[rgb(140,43,43)]"
                : "bg-white border-[rgb(47,111,159)] text-[rgb(47,111,159)]"
            }`}
          >
            {cardBanner.type === "CivicRisk"
              ? "⚠️ Civic Risk"
              : "🎁 Public Good"}
            <p className="text-sm font-normal text-[rgb(51,49,44)] mt-1">
              {cardBanner.description}
            </p>
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
