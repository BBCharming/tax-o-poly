import { toast } from "sonner";
import { usePlayerName } from "../state management/states";
import { useNavigate } from "react-router";

function LandingPage() {
  const navigate = useNavigate();
  const { playerName, setPlayerName } = usePlayerName();

  const handleHost = () => {
    if (!playerName.trim()) {
      toast.error("Name is required!");
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-linear-to-br from-slate-800 via-teal-900 to-slate-900 relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-20 min-h-full">
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-teal-400 rotate-45"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border-2 border-emerald-400 rotate-12"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 border-2 border-cyan-400 -rotate-12"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 border-2 border-teal-300 rotate-45"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-amber-200 mb-2 tracking-wide">
            TAX-OPOLY
          </h1>
          <p className="text-2xl text-white font-semibold">
            The Public Good Game
          </p>
        </div>

        {/* Username input */}
        <div className="mb-6">
          <input
            type="text"
            value={playerName}
            onChange={(event) => {
              setPlayerName(event.target.value.trim());
            }}
            placeholder="Enter your username"
            className="w-full px-6 py-4 bg-slate-800/70 border-2 border-teal-400 rounded-full text-white placeholder-gray-400 text-lg focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-400/50"
          />
        </div>

        {/* Buttons */}
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
              if (!playerName.trim()) {
                toast.error("Name is required!");
              } else {
                navigate("/join");
              }
            }}
          >
            JOIN
          </button>
        </div>

        {/* Tagline */}
        <p className="text-center text-white text-lg">
          Understand taxes. Build a better Zambia.
        </p>
      </div>
    </div>
  );
}

export default LandingPage;
