import { useNavigate } from "react-router";
const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button
      className="absolute top-0 left-6 text-teal-300 hover:text-teal-200 transition-colors flex items-center gap-2 text-lg"
      onClick={() => navigate(-1)}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      Back
    </button>
  );
};

export default BackButton;
