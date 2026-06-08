import BackButton from "../components/backButton";
import { useGame, usePlayer } from "../services/states";
import { socket, startGame } from "../services/socket";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const GameLobby = () => {
  const { isHost, ID } = usePlayer();
  const { roomCode, players, setPlayers, setIsGameStarted } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for real-time player updates
    socket.on("players-updated", (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    // Listen for game start
    socket.on("game-started", () => {
      setIsGameStarted(true);
      toast.success("Game is starting!");
      //   navigate("/game");
    });

    // Listen if host leaves
    socket.on("host-left", () => {
      toast.error("Host left the game. Returning to menu.");
      navigate("/");
    });

    // Cleanup
    return () => {
      socket.off("players-updated");
      socket.off("game-started");
      socket.off("host-left");
    };
  }, [setPlayers, setIsGameStarted, navigate]);

  const handleStartGame = () => {
    if (players.length < 2) {
      toast.error("Need at least 2 players to start the game!");
      return;
    }
    startGame(roomCode);
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-linear-to-br from-slate-800 via-teal-900 to-slate-900 relative overflow-hidden py-6">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-teal-400 rotate-45"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border-2 border-emerald-400 rotate-12"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 border-2 border-cyan-400 -rotate-12"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 border-2 border-teal-300 rotate-45"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl px-6">
        <BackButton />

        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-amber-200 mb-2 tracking-wide">
            TAX-OPOLY
          </h1>
          <p className="text-xl text-white font-semibold">Game Lobby</p>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border-2 border-amber-400/30 text-center">
            <p className="text-amber-300 text-sm font-semibold mb-2">
              Room Code
            </p>
            <p className="text-white text-3xl font-bold font-mono tracking-wider">
              {roomCode}
            </p>
            <p className="text-teal-300 text-sm mt-2">
              {players.length} of 6 Players
            </p>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 mb-6 border-2 border-teal-400/30">
          <h2 className="text-2xl font-bold text-teal-300 mb-6">Players</h2>
          <div className="space-y-3">
            {players.map((player, index) => (
              <div
                key={player.ID}
                className="flex items-center gap-4 bg-slate-700/50 px-6 py-4 rounded-lg border-2 border-teal-400/40"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-teal-500 rounded-full text-white font-bold text-lg">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white text-lg font-semibold">
                    {player.name}
                    {player.isHost && (
                      <span className="ml-2 text-sm text-amber-300 font-normal">
                        (Host)
                      </span>
                    )}
                    {player.ID === ID && !player.isHost && (
                      <span className="ml-2 text-sm text-teal-300 font-normal">
                        (You)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action button for host */}
        {isHost && (
          <button
            onClick={handleStartGame}
            className="w-full py-4 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xl rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={players.length < 2}
          >
            START GAME{" "}
            {players.length < 2 && `(Need ${2 - players.length} more)`}
          </button>
        )}

        {/* Waiting message for non-host */}
        {!isHost && (
          <div className="text-center">
            <p className="text-teal-300 text-lg">
              Waiting for host to start the game...
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Players in lobby: {players.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameLobby;
