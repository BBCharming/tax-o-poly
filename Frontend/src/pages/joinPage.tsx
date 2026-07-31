import { toast } from "sonner";
import { useGame, usePlayer } from "../services/states";
import { useNavigate } from "react-router";
import { joinGameRoom, socket } from "../services/socket";
import { useEffect } from "react";
import { setPlayerName, setLastRoom } from "../services/utils";

function JoinPage() {
  const navigate = useNavigate();
  const { roomCode, setRoomCode, setPlayers } = useGame();
  const { name, setID } = usePlayer();

  useEffect(() => {
    socket.on("player-joined", ({ players, playerId }) => {
      setPlayers(players);
      setID(playerId);
      setLastRoom(roomCode);
      setPlayerName(name);
      navigate("/lobby");
    });

    socket.on("game-not-found", () => {
      toast.error("Game room not found! Check the room code.");
    });

    socket.on("game-full", () => {
      toast.error("Game room is full! (Maximum 6 players)");
    });

    socket.on("error", ({ message }) => {
      toast.error(message);
    });

    return () => {
      socket.off("player-joined");
      socket.off("game-not-found");
      socket.off("game-full");
      socket.off("error");
    };
  }, [navigate, setPlayers, setID, roomCode, name]);

  const handleJoin = () => {
    if (!roomCode.trim()) {
      toast.error("Room Code Cannot Be Empty!");
      return;
    }

    if (!name.trim()) {
      toast.error("Name is required! Please go back and enter your name.");
      navigate("/");
      return;
    }

    joinGameRoom(roomCode, {
      name: name.trim().toUpperCase(),
      isHost: false,
    });
  };

  return (
    <div className="size-full flex items-center justify-center bg-linear-to-br from-[#F7F1E6] via-[#EFE7D8] to-[#E4EEF3] relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
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
          <p className="text-2xl text-[#33312C] font-semibold">Join a Game</p>
        </div>

        <div className="mb-6">
          <label className="block text-[#2F6F9F] text-lg font-semibold mb-3">
            Room Code
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(event) => {
              setRoomCode(event.target.value);
            }}
            placeholder="TAXOPOLY-1234"
            className="w-full px-6 py-4 bg-white border-2 border-[#BFD8E8] rounded-lg text-[#33312C] placeholder-gray-400 text-lg focus:outline-none focus:border-[#2F6F9F] focus:ring-2 focus:ring-[#2F6F9F]/30 text-center font-mono tracking-wider"
          />
        </div>

        <button
          className="w-full py-4 bg-linear-to-r from-[#2F6F9F] to-[#255A82] hover:from-[#3A80B4] hover:to-[#2C6693] text-white font-bold text-xl rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl mb-6 cursor-pointer"
          onClick={handleJoin}
        >
          JOIN
        </button>

        <button
          className="w-full py-3 text-[#2F6F9F] hover:text-[#255A82] transition-colors cursor-pointer"
          onClick={() => {
            navigate("/");
          }}
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
}

export default JoinPage;
