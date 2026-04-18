import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";


let io;
const onlineUsers = new Map(); // userId -> Set of socketIds

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

    if (socket.userId) {
      if (!onlineUsers.has(socket.userId)) {
        onlineUsers.set(socket.userId, new Set());
      }
      onlineUsers.get(socket.userId).add(socket.id);
      io.emit("user_status_change", Array.from(onlineUsers.keys()));
    }

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


    socket.on("send_message", async (data) => {
      try {
        const { chatId, content, fileUrl, fileType, originalName, replyToId, clientSideId } = data;
        
        const newMessage = await prisma.message.create({
          data: {
            chatId,
            content,
            fileUrl,
            fileType,
            originalName,
            replyToId,
            senderId: socket.userId
          },
          include: {
            sender: {
              select: { id: true, fullName: true, profilePic: true }
            },
            replyTo: {
              include: {
                sender: {
                  select: { id: true, fullName: true }
                }
              }
            }
          }
        });

        // 1. Fetch all chat members to ensure they receive the message via their personal rooms
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: { members: { select: { userId: true } } }
        });

        if (chat) {
          chat.members.forEach(member => {
            // Emit to each user's personal room (covers 'Ghost Chat' scenario)
            io.to(`user_${member.userId}`).emit("receive_message", { ...newMessage, clientSideId });
          });
        }
        
        await prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() }
        });
      } catch (error) {
        console.error("Socket Error (send_message):", error.message);
      }
    });

    socket.on("delete_message", ({ chatId, msgId }) => {
      io.to(`chat_${chatId}`).emit("message_deleted", msgId);
    });

    socket.on("pin_message", ({ chatId, msgId, isPinned }) => {
      io.to(`chat_${chatId}`).emit("message_pinned", { msgId, isPinned });
    });

    socket.on("keys_regenerated", ({ chatId }) => {
      console.log(`[CRYPTO] Key regeneration signaled for chat ${chatId} by ${socket.userId}`);
      io.to(`chat_${chatId}`).emit("keys_regenerated_update", { chatId, senderId: socket.userId });
    });

    socket.on("mark_as_read", async ({ chatId, messageIds }) => {
      try {
        await prisma.message.updateMany({
          where: {
            id: { in: messageIds },
            chatId,
            senderId: { not: socket.userId } 
          },
          data: { status: "READ" }
        });

        io.to(`chat_${chatId}`).emit("messages_read", { chatId, messageIds });
      } catch (error) {
        console.error("Socket Error (mark_as_read):", error.message);
      }
    });


    // 2. WebRTC Peer-to-Peer Signaling (Video/Audio Calls)
    // The server blindly routes this encrypted/metadata payload.
    // It NEVER parses the media.
    socket.on("peer-ready", (data) => {
      console.log(`[RTC] Peer Ready Signal: -> user_${data.targetUserId}`);
      io.to(`user_${data.targetUserId}`).emit("peer-ready", data);
    });

    socket.on("webrtc-offer", (data) => {
      console.log(`[RTC] Rerouting Offer: ${socket.userId} -> user_${data.targetUserId} (Chat: ${data.chatId})`);
      io.to(`user_${data.targetUserId}`).emit("webrtc-offer", data);
    });

    socket.on("webrtc-answer", (data) => {
      console.log(`[RTC] Rerouting Answer: ${socket.userId} -> user_${data.targetUserId} (Chat: ${data.chatId})`);
      io.to(`user_${data.targetUserId}`).emit("webrtc-answer", data);
    });

    socket.on("webrtc-ice-candidate", (data) => {
      console.log(`[RTC] Rerouting ICE Candidate: ${socket.userId} -> user_${data.targetUserId}`);
      io.to(`user_${data.targetUserId}`).emit("webrtc-ice-candidate", data);
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
      if (socket.userId && onlineUsers.has(socket.userId)) {
        onlineUsers.get(socket.userId).delete(socket.id);
        if (onlineUsers.get(socket.userId).size === 0) {
          onlineUsers.delete(socket.userId);
        }
        io.emit("user_status_change", Array.from(onlineUsers.keys()));
      }
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
