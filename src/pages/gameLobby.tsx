import BackButton from "../components/backButton";
import { useGame, usePlayer } from "../state management/states";

const GameLobby = () => {
  const { name, ID, isHost } = usePlayer();
  const { roomCode } = useGame();
  const players = [
    {
      ID: ID,
      name: name,
      isHost: isHost,
    },
    {
      ID: 1,
      name: "TEST PLAYER 1",
      isHost: false,
    },
    {
      ID: 2,
      name: "TEST PLAYER 2",
      isHost: false,
    },
    {
      ID: 3,
      name: "TEST PLAYER 3",
      isHost: false,
    },
    {
      ID: 4,
      name: "TEST PLAYER 4",
      isHost: false,
    },
    {
      ID: 5,
      name: "TEST PLAYER 5",
      isHost: false,
    },
  ];
  return (
    <div className="min-h-full flex items-center justify-center bg-linear-to-br from-slate-800 via-teal-900 to-slate-900 relative overflow-hidden py-6">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-teal-400 rotate-45"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border-2 border-emerald-400 rotate-12"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 border-2 border-cyan-400 -rotate-12"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 border-2 border-teal-300 rotate-45"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-2xl px-6">
        {/* Back button */}
        <BackButton />

        {/* Title */}
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
          </div>
        </div>

        {/* Players list */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 mb-6 border-2 border-teal-400/30">
          <h2 className="text-2xl font-bold text-teal-300 mb-6">Players</h2>
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.ID}
                className="flex items-center gap-4 bg-slate-700/50 px-6 py-4 rounded-lg border-2 border-teal-400/40"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-teal-500 rounded-full text-white font-bold text-lg">
                  {player.ID}
                </div>
                <div className="flex-1">
                  <p className="text-white text-lg font-semibold">
                    {player.name}
                    {player.isHost && (
                      <span className="ml-2 text-sm text-amber-300 font-normal">
                        (Host)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
