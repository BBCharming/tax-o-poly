import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import LandingPage from "./pages/landingPage.tsx";
import JoinPage from "./pages/joinPage.tsx";
import { Toaster } from "sonner";
import GameLobby from "./pages/gameLobby.tsx";
import GameBoard from "./pages/mainBoard.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster position="top-right" />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/lobby" element={<GameLobby />} />
        <Route path="/:roomCode/board" element={<GameBoard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
