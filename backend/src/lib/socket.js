import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";


let io;
const onlineUsers = new Map();

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

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

    if (socket.userId) {
      if (!onlineUsers.has(socket.userId)) {
        onlineUsers.set(socket.userId, new Set());
      }
      onlineUsers.get(socket.userId).add(socket.id);
      io.emit("user_status_change", Array.from(onlineUsers.keys()));
    }

    socket.join(`user_${socket.userId}`);
    
    const broadcastCallStatus = async (chatId, isActive, activeCallId = null) => {
      try {
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: { members: { select: { userId: true } } }
        });
        if (chat) {
          chat.members.forEach(member => {
            io.to(`user_${member.userId}`).emit("call:status_changed", { 
              chatId, 
              isActive, 
              activeCallId 
            });
          });
        }
      } catch (err) {
        console.error("Broadcast call status failed:", err);
      }
    };

    socket.on("join-chat", (chatId) => {
      socket.join(`chat_${chatId}`);
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

        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: { members: { select: { userId: true } } }
        });

        if (chat) {
          chat.members.forEach(member => {
            io.to(`user_${member.userId}`).emit("newMessage", { ...newMessage, clientSideId });
          });
        }
        
        await prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() }
        });
      } catch (error) {
      }
    });

    socket.on("delete_message", ({ chatId, msgId }) => {
      io.to(`chat_${chatId}`).emit("message_deleted", msgId);
    });

    socket.on("pin_message", ({ chatId, msgId, isPinned }) => {
      io.to(`chat_${chatId}`).emit("message_pinned", { msgId, isPinned });
    });

    socket.on("keys_regenerated", ({ chatId }) => {
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
      }
    });


    socket.on("peer-ready", (data) => {
      io.to(`user_${data.targetUserId}`).emit("peer-ready", data);
    });

    socket.on("webrtc-offer", (data) => {
      io.to(`user_${data.targetUserId}`).emit("webrtc-offer", {
        ...data,
        fromUserId: socket.userId
      });
    });

    socket.on("webrtc-answer", (data) => {
      io.to(`user_${data.targetUserId}`).emit("webrtc-answer", {
        ...data,
        fromUserId: socket.userId
      });
    });

    socket.on("webrtc-ice-candidate", (data) => {
      io.to(`user_${data.targetUserId}`).emit("webrtc-ice-candidate", {
        ...data,
        fromUserId: socket.userId
      });
    });

    socket.on("call:join", ({ chatId }) => {
      socket.join(`call_${chatId}`);
      socket.to(`call_${chatId}`).emit("call:user-joined", {
        userId: socket.userId,
        chatId
      });
    });

    socket.on("call:initiate", async (data) => {
      const { targetUserId, chatId, callerName, isGroup } = data;
      console.log("BACKEND: Received call:initiate ->", data);

      if (isGroup) {
        socket.to(`chat_${chatId}`).emit("call:incoming", {
          fromUserId: socket.userId,
          callerName,
          chatId,
          isGroupCall: true
        });
      } else {
        io.to(`user_${targetUserId}`).emit("call:incoming", {
          fromUserId: socket.userId,
          callerName,
          chatId,
          isGroupCall: false
        });
      }

      try {
        await prisma.chat.update({
          where: { id: chatId },
          data: { activeCallId: socket.userId }
        });
        
        await broadcastCallStatus(chatId, true, socket.userId);
      } catch (error) {
        console.error("Error updating activeCallId:", error);
      }
    });

    socket.on("call:leave", async ({ chatId }) => {
      socket.leave(`call_${chatId}`);
      
      const room = io.sockets.adapter.rooms.get(`call_${chatId}`);
      const remainingSize = room ? room.size : 0;

      if (remainingSize === 0) {
        await prisma.chat.update({
          where: { id: chatId },
          data: { activeCallId: null }
        });
        await broadcastCallStatus(chatId, false);
      }
    });

    socket.on("call:response", async ({ targetUserId, accepted, chatId }) => {
      io.to(`user_${targetUserId}`).emit("call:response", {
        fromUserId: socket.userId,
        accepted,
        chatId
      });
    });

    socket.on("call:cancel", async ({ targetUserId, chatId }) => {
      try {
        await prisma.chat.update({
          where: { id: chatId },
          data: { activeCallId: null }
        });
        await broadcastCallStatus(chatId, false);
      } catch (error) {
        console.error("Error clearing activeCallId on cancel:", error);
      }

      io.to(`user_${targetUserId}`).emit("call:cancelled", { chatId });
    });

    socket.on("disconnect", async () => {
      if (socket.userId && onlineUsers.has(socket.userId)) {
        onlineUsers.get(socket.userId).delete(socket.id);
        if (onlineUsers.get(socket.userId).size === 0) {
          onlineUsers.delete(socket.userId);
        }
        io.emit("user_status_change", Array.from(onlineUsers.keys()));
      }

      const rooms = io.sockets.adapter.rooms;
      for (const [roomName, room] of rooms) {
        if (roomName.startsWith("call_")) {
          if (room.size === 0) {
            const chatId = roomName.replace("call_", "");
            await prisma.chat.update({
              where: { id: chatId },
              data: { activeCallId: null }
            });
            await broadcastCallStatus(chatId, false);
          }
        }
      }

      try {
        const chatsWithUser = await prisma.chat.findMany({
          where: { activeCallId: socket.userId }
        });

        for (const chat of chatsWithUser) {
          const room = io.sockets.adapter.rooms.get(`call_${chat.id}`);
          if (!room || room.size === 0) {
            await prisma.chat.update({
              where: { id: chat.id },
              data: { activeCallId: null }
            });
            await broadcastCallStatus(chat.id, false);
          }
        }
      } catch (error) {
        console.error("Disconnect cleanup fallback error:", error);
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
