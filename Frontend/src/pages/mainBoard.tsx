import { useEffect, useRef, useState } from "react";
import { useGame, usePlayer } from "../services/states";
import { socket, rollDice, leaveGame, declareTax } from "../services/socket";
import { useNavigate } from "react-router";
import { toast } from "sonner";

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
    debrief: any;
    players: any[];
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

    const handleGameOver = ({ winner, message, debrief, players }: any) => {
      setGameOver({ winner, message, debrief, players });
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

  const renderQliSparkline = (history: { seq: number; qli: number }[]) => {
    const width = 600;
    const height = 160;
    const padding = 28;
    const toXY = (i: number, qliValue: number) => {
      const x = padding + (i / (history.length - 1)) * (width - padding * 2);
      const y = height - padding - (qliValue / 100) * (height - padding * 2);
      return [x, y];
    };
    const points = history.map((h, i) => toXY(i, h.qli).join(",")).join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        {[0, 25, 50, 75, 100].map((mark) => {
          const [, y] = toXY(0, mark);
          return (
            <g key={mark}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="rgb(222,220,209)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text x={2} y={y + 4} fontSize={10} fill="rgb(140,138,130)">
                {mark}
              </text>
            </g>
          );
        })}
        <polyline
          points={points}
          fill="none"
          stroke="rgb(47,111,159)"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {history.map((h, i) => {
          const [x, y] = toXY(i, h.qli);
          return <circle key={i} cx={x} cy={y} r={3} fill="rgb(47,111,159)" />;
        })}
      </svg>
    );
  };

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
    const { debrief, winner, players: finalPlayers } = gameOver;
    const stats = debrief?.stats;
    const qliChange = debrief ? debrief.finalQli - debrief.startingQli : 0;

    let complianceMessage = "";
    if (!stats || stats.totalDeclarations === 0) {
      complianceMessage =
        "No Income Tax declarations landed this game, but the treasury still moved — public funds shift based on more than just individual tax choices.";
    } else if (stats.complianceRate >= 80) {
      complianceMessage = `Your group declared in full ${stats.complianceRate}% of the time — that's high compliance, and it shows: consistent, low-risk contributions add up to more reliable public funding than occasional windfalls from under-declaring.`;
    } else if (stats.complianceRate >= 40) {
      complianceMessage = `Your group declared in full ${stats.complianceRate}% of the time — a mixed record. ${stats.auditedCount} under-declaration${stats.auditedCount === 1 ? "" : "s"} got caught by audit and cost more than paying honestly would have. That's the point: evasion usually isn't the good bet it looks like.`;
    } else {
      complianceMessage = `Your group declared in full only ${stats.complianceRate}% of the time. Widespread under-declaring shrinks the shared pool everyone depends on — and audits only ever catch some of it. The rest is a quiet loss to public services that never gets pinned on any one person.`;
    }

    return (
      <div className="min-h-screen bg-linear-to-br from-[#F7F1E6] via-[#EFE7D8] to-[#E4EEF3] p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          <div className="bg-linear-to-r from-[#2F6F9F] to-[#1F4E73] px-8 py-8 text-center shrink-0">
            <p className="text-white/80 text-sm font-semibold uppercase tracking-wide mb-2">
              Game Complete
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
              The Debrief
            </h1>
            <p className="text-white/90 max-w-xl mx-auto text-sm md:text-base">
              Twelve months of decisions — full declarations, calculated risks,
              shared costs — shaped how your community's Quality-of-Life Index
              moved. Here's what happened, and why it matters.
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-8 overflow-y-auto">
            {/* QLI headline + trajectory */}
            <section>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-semibold">
                    Quality-of-Life Index
                  </p>
                  <p className="text-5xl font-black text-[rgb(47,111,159)]">
                    {debrief?.finalQli ?? qli}%
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Started at {debrief?.startingQli ?? 50}% ·{" "}
                    {qliChange > 0
                      ? `up ${qliChange} points`
                      : qliChange < 0
                        ? `down ${Math.abs(qliChange)} points`
                        : "unchanged"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-semibold">
                    Public Treasury
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    K{(debrief?.finalTreasury ?? treasury).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Started at K
                    {(debrief?.startingTreasury ?? 4250).toLocaleString()}
                  </p>
                </div>
              </div>
              {debrief?.qliHistory?.length > 1 &&
                renderQliSparkline(debrief.qliHistory)}
            </section>

            {/* Key moments */}
            {(debrief?.biggestDrop || debrief?.biggestGain) && (
              <section>
                <h2 className="text-lg font-bold text-[rgb(51,49,44)] mb-3">
                  Key Moments
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {debrief.biggestDrop && (
                    <div className="p-4 rounded-xl border-2 border-[rgb(140,43,43)] bg-[rgb(253,244,244)]">
                      <p className="text-sm font-semibold text-[rgb(140,43,43)] mb-1">
                        Biggest QLI drop ({debrief.biggestDrop.change}%)
                      </p>
                      <p className="text-sm text-gray-700">
                        {debrief.biggestDrop.description}
                      </p>
                    </div>
                  )}
                  {debrief.biggestGain && (
                    <div className="p-4 rounded-xl border-2 border-[rgb(47,111,159)] bg-[rgb(235,244,250)]">
                      <p className="text-sm font-semibold text-[rgb(47,111,159)] mb-1">
                        Biggest QLI gain (+{debrief.biggestGain.change}%)
                      </p>
                      <p className="text-sm text-gray-700">
                        {debrief.biggestGain.description}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Tax compliance stats */}
            {stats && (
              <section>
                <h2 className="text-lg font-bold text-[rgb(51,49,44)] mb-3">
                  How the group handled taxes
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-2xl font-bold text-[rgb(47,111,159)]">
                      {stats.fullCount}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Declared in full
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-2xl font-bold text-[rgb(239,159,39)]">
                      {stats.underCleanCount + stats.auditedCount}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Under-declared</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-2xl font-bold text-[rgb(140,43,43)]">
                      {stats.auditedCount}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Caught by audit
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.complianceRate}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Compliance rate
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Full timeline */}
            {debrief?.events?.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[rgb(51,49,44)] mb-3">
                  What happened, in order
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                  {debrief.events.map((e: any) => {
                    const change = e.qliAfter - e.qliBefore;
                    return (
                      <div
                        key={e.seq}
                        className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
                      >
                        <div
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                            change < 0
                              ? "bg-[rgb(140,43,43)]"
                              : change > 0
                                ? "bg-[rgb(47,111,159)]"
                                : "bg-gray-400"
                          }`}
                        ></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">
                            {e.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Month {e.turnNumber} · QLI {e.qliBefore}% →{" "}
                            {e.qliAfter}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Educational debrief */}
            <section className="bg-[rgb(235,244,250)] rounded-xl p-6 border-2 border-[rgb(191,216,232)]">
              <h2 className="text-lg font-bold text-[rgb(47,111,159)] mb-3">
                Why this matters
              </h2>
              <p className="text-sm text-gray-700 mb-3">{complianceMessage}</p>
              <p className="text-sm text-gray-700">
                Taxes fund the public goods no single person could build alone —
                clinics, schools, roads, emergency services. When enough people
                contribute, the cost per person is small but the benefit is
                shared by everyone, including people who couldn't otherwise
                afford it. When compliance slips, those services don't vanish
                all at once — the Quality-of-Life Index in this game stands in
                for that slower, collective erosion, which is easy to miss
                because no single missed payment feels like the cause. And as
                this game showed with its treasury-only events, not every dip is
                a personal compliance failure either — how well collected funds
                are managed matters just as much as whether they were paid in
                the first place.
              </p>
            </section>

            {/* Final money standings — kept, but deliberately de-emphasized */}
            <section>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-gray-700 select-none">
                  For reference: final balances (money wasn't the point) ▾
                </summary>
                <div className="mt-3 space-y-2">
                  {(finalPlayers ?? players)
                    .slice()
                    .sort((a: any, b: any) => b.money - a.money)
                    .map((p: any, i: number) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50"
                      >
                        <span className="text-sm text-gray-700">
                          {i + 1}. {p.name}
                          {winner && p.id === winner.id ? " 🏅" : ""}
                        </span>
                        <span className="text-sm text-gray-600">
                          K{p.money}
                        </span>
                      </div>
                    ))}
                </div>
              </details>
            </section>
          </div>

          <div className="p-6 border-t border-gray-200 shrink-0">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[rgb(47,111,159)] hover:bg-[rgb(37,90,130)] text-white font-bold py-3 rounded-lg transition-colors"
            >
              Play Again
            </button>
          </div>
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
                          Waiting for host to start the game...
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
              Income Tax
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
              Quit Game?
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
