import { toast } from "sonner";
import { useGame, usePlayer } from "../services/states";
import { useNavigate } from "react-router";
import { createGameRoom, socket } from "../services/socket";
import { useEffect } from "react";
import { setLastRoom, setPlayerName } from "../services/utils";

function LandingPage() {
  const navigate = useNavigate();
  const { name, setName, setIsHost, setId } = usePlayer();
  const { setRoomCode, setPlayers } = useGame();

  useEffect(() => {
    socket.on("game-created", ({ roomCode, players, playerId }) => {
      setPlayers(players);
      setId(playerId);
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
  }, [navigate, setPlayers, setId, setRoomCode, name]);

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
    <div className="min-h-full flex items-center justify-center bg-linear-to-br from-[#F7F1E6] via-[#EFE7D8] to-[#E4EEF3] relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 min-h-full">
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-[#8FB7D1] rotate-45"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border-2 border-[#6E93AE] rotate-12"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 border-2 border-[#B9D4E3] -rotate-12"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 border-2 border-[#7FA9C4] rotate-45"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-[#2F6F9F] mb-2 tracking-wide">
            TAX-OPOLY
          </h1>
          <p className="text-2xl text-[#33312C] font-semibold">
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
            className="w-full px-6 py-4 bg-white border-2 border-[#BFD8E8] rounded-full text-[#33312C] placeholder-gray-400 text-lg focus:outline-none focus:border-[#2F6F9F] focus:ring-2 focus:ring-[#2F6F9F]/30"
          />
        </div>

        <div className="flex gap-4 mb-8">
          <button
            className="flex-1 py-4 bg-linear-to-r from-[#2F6F9F] to-[#255A82] hover:from-[#3A80B4] hover:to-[#2C6693] text-white font-bold text-xl rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl cursor-pointer"
            onClick={handleHost}
          >
            HOST
          </button>
          <button
            className="flex-1 py-4 bg-linear-to-r from-[#2F6F9F] to-[#255A82] hover:from-[#3A80B4] hover:to-[#2C6693] text-white font-bold text-xl rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl cursor-pointer"
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

        <p className="text-center text-[#33312C] text-lg">
          Understand taxes. Build a better Zambia.
        </p>
      </div>
    </div>
  );
}

export default LandingPage;
