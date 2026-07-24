export const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getPlayerId = (): string => {
  let playerId = localStorage.getItem("playerId");
  if (!playerId) {
    playerId = generateUUID();
    localStorage.setItem("playerId", playerId);
  }
  return playerId;
};

export const getPlayerName = (): string => {
  return localStorage.getItem("playerName") || "";
};

export const setPlayerName = (name: string): void => {
  localStorage.setItem("playerName", name);
};

export const getLastRoom = (): string => {
  return localStorage.getItem("lastRoom") || "";
};

export const setLastRoom = (roomCode: string): void => {
  localStorage.setItem("lastRoom", roomCode);
};

export const clearPlayerData = (): void => {
  localStorage.removeItem("playerId");
  localStorage.removeItem("playerName");
  localStorage.removeItem("lastRoom");
};
