import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import LandingPage from "./pages/landingPage.tsx";
import JoinPage from "./pages/joinPage.tsx";
import { Toaster } from "sonner";
import GameLobby from "./pages/gameLobby.tsx";
import GameBoard from "./pages/mainBoard.tsx";
import { useSocketListeners } from "./services/useSocketListeners.ts";
import { usePlayer } from "./services/states.ts";
import { getPlayerName, getLastRoom } from "./services/utils.ts";
import { rejoinGame } from "./services/socket.ts";

function Root() {
  const { initializeFromStorage, id } = usePlayer();
  useSocketListeners();

  useEffect(() => {
    initializeFromStorage();
  }, [initializeFromStorage]);

  useEffect(() => {
    const lastRoom = getLastRoom();
    const storedName = getPlayerName();

    if (lastRoom && storedName && id) {
      rejoinGame(lastRoom, id, storedName);
    }
  }, [id]);

  return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/lobby" element={<GameLobby />} />
          <Route path="/:roomCode/board" element={<GameBoard />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
