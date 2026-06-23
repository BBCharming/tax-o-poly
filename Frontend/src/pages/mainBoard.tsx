export default function GameBoard() {
  // Corners
  const corners = {
    topLeft: { name: "Free Parking", color: "gray" },
    topRight: { name: "GO →", color: "gray" },
    bottomLeft: { name: "Audit Lock!", color: "red" },
    bottomRight: { name: "Tax Office", color: "gray" },
  };

  // Top row (left to right, excluding corners)
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

  // Right column (top to bottom, excluding corners)
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

  // Bottom row (right to left, excluding corners)
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

  // Left column (bottom to top, excluding corners)
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

  const renderSpace = (
    space: any,
    isCorner = false,
    rotation = "",
    isSide = false,
  ) => {
    const colors = getSpaceColors(space.color);

    if (isCorner) {
      return (
        <div
          className={`${colors.bg} ${colors.border} border-2 flex items-center justify-center shrink-0`}
          style={{ width: "120px", height: "120px" }}
        >
          <div className={`${colors.text} font-bold text-center px-2 text-sm`}>
            {space.name}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`bg-white border border-gray-300 flex flex-col shrink-0 ${isSide ? "" : "w-full"}`}
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-800 via-teal-900 to-slate-900 p-6 flex items-center justify-center">
      <div className="relative w-full max-w-260">
        {/* Top Bar: Treasury + QLI - positioned above board */}
        <div className="bg-[rgb(8,80,65)] rounded-t-xl px-6 py-3 mb-2">
          <div className="flex items-center justify-between">
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
                Quality-of-Life Index
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-3 bg-[rgb(38,38,36)] rounded-full border border-[rgba(222,220,209,0.3)]">
                  <div className="h-full w-[70%] bg-[rgb(39,80,10)] rounded-full"></div>
                </div>
                <span className="text-[rgb(194,192,182)] text-sm">70%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Board */}
        <div className="bg-teal-100 border-8 border-gray-800 shadow-2xl">
          {/* Board Grid */}
          <div className="w-full flex flex-col">
            {/* Top Row */}
            <div className="flex w-full">
              {/* Top Left Corner */}
              {renderSpace(corners.topLeft, true)}
              {/* Top Spaces */}
              <div className="flex flex-1">
                {topSpaces.map((space, idx) => (
                  <div key={idx} className="flex-1">
                    {renderSpace(space)}
                  </div>
                ))}
              </div>
              {/* Top Right Corner */}
              {renderSpace(corners.topRight, true)}
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
                      {renderSpace(space, false, "", true)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Center Area */}
              <div className="flex-1 bg-teal-50 flex flex-col items-center justify-center p-8">
                {/* Logo/Title */}
                <div className="bg-linear-to-r from-red-600 to-red-700 px-12 py-6 rounded-xl shadow-xl mb-8 border-4 border-white">
                  <h1 className="text-6xl font-black text-white tracking-wider text-center">
                    TAX-OPOLY
                  </h1>
                  <p className="text-white text-center text-lg font-semibold mt-2">
                    The Public Good Game
                  </p>
                </div>

                {/* Player Info */}
                <div className="bg-white/80 rounded-xl p-6 shadow-lg mb-6">
                  <p className="text-gray-800 font-semibold text-center mb-4">
                    Turn 7 · Isaac's turn
                  </p>
                </div>

                {/* Dice Controls */}
                <div className="flex gap-4">
                  <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-lg shadow-lg transition-colors">
                    🎲 ROLL DICE
                  </button>
                  <div className="bg-amber-500 px-6 py-3 rounded-lg shadow-lg border-2 border-amber-600">
                    <div className="text-white text-xs text-center font-semibold">
                      Last roll
                    </div>
                    <div className="text-white font-bold text-lg text-center">
                      3 + 4
                    </div>
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
                      {renderSpace(space, false, "", true)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex w-full">
              {/* Bottom Left Corner */}
              {renderSpace(corners.bottomLeft, true)}
              {/* Bottom Spaces */}
              <div className="flex flex-1">
                {bottomSpaces.map((space, idx) => (
                  <div key={idx} className="flex-1">
                    {renderSpace(space)}
                  </div>
                ))}
              </div>
              {/* Bottom Right Corner */}
              {renderSpace(corners.bottomRight, true)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
