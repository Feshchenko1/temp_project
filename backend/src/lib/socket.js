import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  // Socket.io Authentication Middleware
  io.use((socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) return next(new Error("Authentication error: No cookies"));

      const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('jwt='));
      if (!tokenCookie) return next(new Error("Authentication error: No JWT cookie"));

      const token = tokenCookie.split('=')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected to Socket.io: ${socket.userId} (${socket.id})`);

    // 1. Join personal room for direct signaling (incoming calls/messages)
    socket.join(`user_${socket.userId}`);

    // Join group chat rooms
    socket.on("join-chat", (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`User ${socket.userId} joined chat_${chatId}`);
    });

    socket.on("leave-chat", (chatId) => {
      socket.leave(`chat_${chatId}`);
    });

    socket.on("send_message", (data) => {
      socket.to(`chat_${data.chatId}`).emit("receive_message", {
        ...data,
        senderId: socket.userId
      });
    });

    // 2. WebRTC Peer-to-Peer Signaling (Video/Audio Calls)
    // The server blindly routes this encrypted/metadata payload.
    // It NEVER parses the media.
    socket.on("webrtc-offer", ({ targetUserId, offer, chatId }) => {
      console.log(`[RTC] Offer from ${socket.userId} to ${targetUserId} (Chat: ${chatId})`);
      io.to(`user_${targetUserId}`).emit("webrtc-offer", {
        fromUserId: socket.userId,
        offer,
        chatId
      });
    });

    socket.on("webrtc-answer", ({ targetUserId, answer, chatId }) => {
      console.log(`[RTC] Answer from ${socket.userId} to ${targetUserId} (Chat: ${chatId})`);
      io.to(`user_${targetUserId}`).emit("webrtc-answer", {
        fromUserId: socket.userId,
        answer,
        chatId
      });
    });

    socket.on("webrtc-ice-candidate", ({ targetUserId, candidate, chatId }) => {
      io.to(`user_${targetUserId}`).emit("webrtc-ice-candidate", {
        fromUserId: socket.userId,
        candidate,
        chatId
      });
    });

    // 3. Formal Call Signaling (Modal support)
    socket.on("call:initiate", ({ targetUserId, chatId, callerName }) => {
      console.log(`[CALL] Initiation from ${socket.userId} to ${targetUserId} (Chat: ${chatId})`);
      io.to(`user_${targetUserId}`).emit("call:incoming", {
        fromUserId: socket.userId,
        callerName,
        chatId
      });
    });

    socket.on("call:response", ({ targetUserId, accepted, chatId }) => {
      console.log(`[CALL] Response from ${socket.userId} to ${targetUserId} (Accepted: ${accepted})`);
      io.to(`user_${targetUserId}`).emit("call:response", {
        fromUserId: socket.userId,
        accepted,
        chatId
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized");
  }
  return io;
};
