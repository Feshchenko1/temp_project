import { io } from "socket.io-client";

// Singleton socket instance for the frontend
let socket = null;

export const getSocket = () => {
  if (!socket) {
    // Only connect when requested to save Pi resources
    socket = io(import.meta.env.VITE_API_BASE_URL || "http://localhost:5001", {
      withCredentials: true,
      autoConnect: false, // Wait until we call socket.connect()
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};
