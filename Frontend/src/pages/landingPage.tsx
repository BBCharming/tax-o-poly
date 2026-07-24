import { toast } from "sonner";
import { useGame, usePlayer } from "../services/states";
import { useNavigate } from "react-router";
import { createGameRoom, socket } from "../services/socket";
import { useEffect } from "react";
import { setLastRoom, setPlayerName } from "../services/utils";

function LandingPage() {
  const navigate = useNavigate();
  const { name, setName, setIsHost, setID, ID } = usePlayer();
  const { setRoomCode, setPlayers } = useGame();

  useEffect(() => {
    socket.on("game-created", ({ roomCode, players, playerId }) => {
      setPlayers(players);
      setID(playerId);
      setRoomCode(roomCode);
      setLastRoom(roomCode);
      setPlayerName(name);
      navigate("/lobby");
    });

    socket.on("error", ({ message }) => {
      toast.error(message);
    });

    return () => {
      socket.off("game-created");
      socket.off("error");
    };
  }, [navigate, setPlayers, setID, setRoomCode, name]);

  const handleHost = () => {
    if (!name.trim()) {
      toast.error("Name is required!");
      return;
    }

    const codeNumber = Math.floor(Math.random() * 9000) + 1000;
    const gameCode = `TAXOPOLY-${codeNumber}`;

    setRoomCode(gameCode);
    setIsHost(true);
    setPlayerName(name.trim().toUpperCase());

    createGameRoom(gameCode, {
      name: name.trim().toUpperCase(),
      isHost: true,
    });
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-linear-to-br from-slate-800 via-teal-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 min-h-full">
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-teal-400 rotate-45"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border-2 border-emerald-400 rotate-12"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 border-2 border-cyan-400 -rotate-12"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 border-2 border-teal-300 rotate-45"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-amber-200 mb-2 tracking-wide">
            TAX-OPOLY
          </h1>
          <p className="text-2xl text-white font-semibold">
            The Public Good Game
          </p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value.trim().toLocaleUpperCase());
            }}
            placeholder="Enter your username"
            className="w-full px-6 py-4 bg-slate-800/70 border-2 border-teal-400 rounded-full text-white placeholder-gray-400 text-lg focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-400/50"
          />
        </div>

        <div className="flex gap-4 mb-8">
          <button
            className="flex-1 py-4 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-bold text-xl rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl cursor-pointer"
            onClick={handleHost}
          >
            HOST
          </button>
          <button
            className="flex-1 py-4 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xl rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl cursor-pointer"
            onClick={() => {
              if (!name.trim()) {
                toast.error("Name is required!");
              } else {
                navigate("/join");
              }
            }}
          >
            JOIN
          </button>
        </div>

        <p className="text-center text-white text-lg">
          Understand taxes. Build a better Zambia.
        </p>
      </div>
    </div>
  );
}

export default LandingPage;
