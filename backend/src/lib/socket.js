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
            io.to(`user_${member.userId}`).emit("receive_message", { ...newMessage, clientSideId });
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
      io.to(`user_${data.targetUserId}`).emit("webrtc-offer", data);
    });

    socket.on("webrtc-answer", (data) => {
      io.to(`user_${data.targetUserId}`).emit("webrtc-answer", data);
    });

    socket.on("webrtc-ice-candidate", (data) => {
      io.to(`user_${data.targetUserId}`).emit("webrtc-ice-candidate", data);
    });

    socket.on("call:initiate", ({ targetUserId, chatId, callerName }) => {
      io.to(`user_${targetUserId}`).emit("call:incoming", {
        fromUserId: socket.userId,
        callerName,
        chatId
      });
    });

    socket.on("call:response", ({ targetUserId, accepted, chatId }) => {
      io.to(`user_${targetUserId}`).emit("call:response", {
        fromUserId: socket.userId,
        accepted,
        chatId
      });
    });

    socket.on("disconnect", () => {
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
