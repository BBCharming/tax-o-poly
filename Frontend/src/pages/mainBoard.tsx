import { useEffect, useState } from "react";
import { useGame, usePlayer } from "../services/states";
import { playerColors, playerTokens } from "../services/playerConfigs";
import { socket, rollDice, leaveGame } from "../services/socket";
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
    turnNumber,
    setTurnNumber,
    setCurrentDiceRoll,
  } = useGame();
  const { ID, position, setPosition, setIsHost, setName } = usePlayer();
  const [isRolling, setIsRolling] = useState(false);
  const [movingPlayer, setMovingPlayer] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<{
    winner: any;
    message: string;
  } | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

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
    { name: "Farm", price: "K140", color: "brown" },
    { name: "Port", price: "K240", color: "blue" },
  ];

  const bottomSpaces = [
    { name: "Sewer", price: "K100", color: "teal" },
    { name: "Park", price: "K140", color: "green" },
    { name: "Civic Risk", color: "orange" },
    { name: "Market", price: "K180", color: "green" },
    { name: "Library", price: "K160", color: "green" },
    { name: "Road", price: "K200", color: "blue" },
    { name: "Public Good", color: "orange" },
    { name: "Bridge", price: "K220", color: "blue" },
  ];

  const leftSpaces = [
    { name: "Police", price: "K120", color: "teal" },
    { name: "Water", price: "K175", color: "teal" },
    { name: "Public Good", color: "orange" },
    { name: "Power Grid", price: "K180", color: "teal" },
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

  // Local-only listeners: things that don't belong in global state
  // (component animation, page-specific toasts, and the game-over modal,
  // which the global store doesn't track). Everything else — players,
  // currentTurn, turnNumber, position — is handled by useSocketListeners
  // in main.tsx and is already correct by the time this component mounts.
  useEffect(() => {
    // Drives the token "hop" animation only
    socket.on("dice-rolled", ({ playerId }) => {
      setMovingPlayer(playerId);
      setIsRolling(false);
      setTimeout(() => setMovingPlayer(null), 600);
    });

    // Page-specific toast when host changes mid-game
    socket.on("host-left", ({ newHostName }) => {
      toast.info(`${newHostName} is now the new host!`);
    });

    // Game over modal — not tracked globally, so handled here
    socket.on("game-over", ({ winner, message }) => {
      setGameOver({ winner, message });
    });

    return () => {
      socket.off("dice-rolled");
      socket.off("host-left");
      socket.off("game-over");
    };
  }, []);

  const handleRollDice = () => {
    if (isRolling || currentTurn !== ID || !isGameStarted || gameOver) return;

    setIsRolling(true);
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;
    const newPosition = (position + total) % 40;

    rollDice(roomCode, ID, dice1, dice2, newPosition);
  };

  const handleQuitGame = () => {
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
      <div className="min-h-screen bg-linear-to-br from-slate-800 via-teal-900 to-slate-900 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-3xl font-bold text-center text-red-600 mb-4">
            🏆 Game Over!
          </h2>
          <div className="text-center mb-6">
            <p className="text-xl font-semibold text-gray-800">
              {gameOver.message}
            </p>
            {gameOver.winner && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-400">
                <p className="text-lg font-bold text-yellow-700">
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-800 via-teal-900 to-slate-900 p-4 flex items-center justify-center">
      <div className="relative w-full max-w-6xl">
        {/* Top Bar */}
        <div className="bg-[rgb(8,80,65)] rounded-t-xl px-6 py-3 mb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="text-[rgb(250,249,245)] font-medium text-sm">
                Public treasury
              </span>
              <span className="text-[rgb(250,249,245)] font-medium text-sm">
                K 4,250
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[rgb(250,249,245)] font-medium text-sm">
                Month:
              </span>
              <span className="text-amber-300 font-bold">{turnNumber}/12</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[rgb(250,249,245)] font-medium text-sm">
                Current Turn:
              </span>
              <span className="text-amber-300 font-bold">
                {currentPlayerName}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[rgb(250,249,245)] font-medium text-sm">
                Quality-of-Life Index
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-3 bg-[rgb(38,38,36)] rounded-full border border-[rgba(222,220,209,0.3)]">
                  <div className="h-full w-[70%] bg-[rgb(39,80,10)] rounded-full"></div>
                </div>
                <span className="text-[rgb(194,192,182)] text-sm">70%</span>
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
          <div className="flex-1 bg-teal-100 border-8 border-gray-800 shadow-2xl">
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
                {renderSpace(corners.topRight, 10, true)}
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
                        {renderSpace(space, 39 - idx, false, true)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Center Area */}
                <div className="flex-1 bg-teal-50 flex flex-col items-center justify-center p-8">
                  <div className="bg-linear-to-r from-red-600 to-red-700 px-12 py-6 rounded-xl shadow-xl mb-6 border-4 border-white">
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
                              } ${isTurn ? "ring-2 ring-amber-400" : ""}`}
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
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isTurn && (
                                  <span className="text-xs bg-amber-400 text-white px-2 py-1 rounded-full">
                                    Turn
                                  </span>
                                )}
                                <span className="text-sm text-gray-600">
                                  K {player.money || 1500}
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
                            gameOver !== null
                          }
                          className={`bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-lg shadow-lg transition-colors ${
                            isRolling ||
                            currentTurn !== ID ||
                            !isGameStarted ||
                            gameOver !== null
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {isRolling ? "🎲 Rolling..." : "🎲 ROLL DICE"}
                        </button>
                        {currentDiceRoll.length > 0 && (
                          <div className="bg-amber-500 px-6 py-3 rounded-lg shadow-lg border-2 border-amber-600">
                            <div className="text-white text-xs text-center font-semibold">
                              Last roll
                            </div>
                            <div className="text-white font-bold text-lg text-center">
                              {currentDiceRoll[0]} + {currentDiceRoll[1]}
                            </div>
                          </div>
                        )}
                      </div>
                      {!isGameStarted && (
                        <p className="text-sm text-amber-600 mt-2 font-semibold">
                          ⏳ Waiting for host to start the game...
                        </p>
                      )}
                      {isGameStarted && (
                        <p className="text-sm text-gray-600 mt-2">
                          Month {turnNumber}/12
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
                        {renderSpace(space, 20 + idx, false, true)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex w-full">
                {renderSpace(corners.bottomLeft, 30, true)}
                <div className="flex flex-1">
                  {bottomSpaces.map((space, idx) => (
                    <div key={idx} className="flex-1">
                      {renderSpace(space, 29 - idx)}
                    </div>
                  ))}
                </div>
                {renderSpace(corners.bottomRight, 20, true)}
              </div>
            </div>
          </div>
        </div>
      </div>

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
