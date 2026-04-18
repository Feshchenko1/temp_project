import { prisma } from "../lib/db.js";
import { deleteFile } from "../lib/s3.js";
import { getIo } from "../lib/socket.js";


export async function getChat(req, res) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePic: true,
                publicKey: true,
                bio: true,
                location: true,
                instrumentsKnown: true,
                instrumentsToLearn: true,
                spokenLanguages: true,
              }
            }
          }
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const isMember = chat.members.some(m => m.userId === currentUserId);
    if (!isMember) {
      return res.status(403).json({ message: "Unauthorized access to this chat" });
    }
    const formattedChat = {
      ...chat,
      members: chat.members.map(m => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    };

    res.status(200).json(formattedChat);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOrCreateChat(req, res) {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "Cannot create a chat with yourself" });
    }

    let chat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: currentUserId } } },
          { members: { some: { userId: targetUserId } } }
        ]
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePic: true,
                publicKey: true,
              }
            }
          }
        }
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          isGroup: false,
          chatType: "PERMANENT",
          members: {
            create: [
              { userId: currentUserId, role: "ADMIN" },
              { userId: targetUserId, role: "MEMBER" }
            ]
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  profilePic: true,
                  publicKey: true,
                  bio: true,
                  location: true,
                  instrumentsKnown: true,
                  instrumentsToLearn: true,
                  spokenLanguages: true,
                }
              }
            }
          }
        }
      });
    }

    const formattedChat = {
      ...chat,
      members: chat.members.map(m => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    };

    res.status(200).json(formattedChat);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getRecentChats(req, res) {
  try {
    const currentUserId = req.user.id;

    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: { userId: currentUserId }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePic: true,
                publicKey: true,
                bio: true,
                location: true,
                instrumentsKnown: true,
                instrumentsToLearn: true,
                spokenLanguages: true,
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 8
    });

    const formattedChats = chats.map(chat => {
      const otherMember = chat.isGroup 
        ? null 
        : chat.members.find(m => m.userId !== currentUserId)?.user;

      return {
        ...chat,
        otherMember,
        lastMessage: chat.messages[0] || null,
        members: chat.members.map(m => ({
          ...m.user,
          role: m.role,
          joinedAt: m.joinedAt
        }))
      };
    });

    res.status(200).json(formattedChats);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getChatMessages(req, res) {
  try {
    const { id: chatId } = req.params;
    const currentUserId = req.user.id;

    const membership = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: { chatId, userId: currentUserId }
      }
    });

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this chat" });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
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
      },
      orderBy: { createdAt: "asc" }
    });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteMessage(req, res) {
  try {
    const { msgId } = req.params;
    const currentUserId = req.user.id;

    const message = await prisma.message.findUnique({
      where: { id: msgId }
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId !== currentUserId) {
      return res.status(403).json({ message: "Unauthorized to delete this message" });
    }

    if (message.fileUrl) {
      await deleteFile(message.fileUrl);
    }
    await prisma.message.delete({
      where: { id: msgId }
    });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateMessage(req, res) {
  try {
    const { msgId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user.id;

    const message = await prisma.message.findUnique({
      where: { id: msgId }
    });

    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.senderId !== currentUserId) return res.status(403).json({ message: "Unauthorized" });

    const updated = await prisma.message.update({
      where: { id: msgId },
      data: { content },
      include: {
        sender: { select: { id: true, fullName: true, profilePic: true } },
        replyTo: { include: { sender: { select: { id: true, fullName: true } } } }
      }
    });

    getIo().to(`chat_${updated.chatId}`).emit("message_updated", updated);

    res.status(200).json(updated);

  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function togglePinMessage(req, res) {
  try {
    const { msgId } = req.params;
    
    const message = await prisma.message.findUnique({
      where: { id: msgId }
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: msgId },
      data: { isPinned: !message.isPinned }
    });

    getIo().to(`chat_${updatedMessage.chatId}`).emit("message_pinned", { 
      msgId: updatedMessage.id, 
      isPinned: updatedMessage.isPinned 
    });

    res.status(200).json(updatedMessage);

  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endChatSession(req, res) {
  try {
    const { id: chatId } = req.params;
    const currentUserId = req.user.id;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { 
        members: true,
        messages: true 
      }
    });

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const membership = chat.members.find(m => m.userId === currentUserId);
    if (!membership) return res.status(403).json({ message: "Unauthorized" });

    if (chat.chatType === "EPHEMERAL") {
      for (const msg of chat.messages) {
        if (msg.fileUrl) {
          await deleteFile(msg.fileUrl);
        }
      }

      await prisma.groupKey.deleteMany({
        where: { chatId }
      });

      await prisma.chat.delete({
        where: { id: chatId }
      });

      return res.status(200).json({ message: "Ephemeral session destroyed correctly" });
    }

    res.status(400).json({ message: "Can only destroy Ephemeral sessions" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getGroupKeys(req, res) {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.id;
    const membership = await prisma.chatMember.findFirst({
      where: { chatId, userId: currentUserId }
    });

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this chat" });
    }

    const keys = await prisma.groupKey.findMany({
      where: { chatId },
      select: {
        recipientId: true,
        encryptedAesKey: true,
        senderId: true,
      }
    });

    res.status(200).json(keys);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function storeGroupKeys(req, res) {
  try {
    const { chatId, keys } = req.body;
    const senderId = req.user.id;

    if (!chatId || !keys || !Array.isArray(keys)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const membership = await prisma.chatMember.findFirst({
      where: { chatId, userId: senderId }
    });

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this chat" });
    }

    await prisma.$transaction([
      prisma.groupKey.deleteMany({
        where: { chatId }
      }),
      prisma.groupKey.createMany({
        data: keys.map(k => ({
          chatId,
          senderId,
          recipientId: k.recipientId,
          encryptedAesKey: k.encryptedAesKey,
        }))
      })
    ]);

    res.status(200).json({ success: true, message: "Group keys stored successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}



export async function getUnreadCounts(req, res) {
  try {
    const currentUserId = req.user.id;

    const unreadMessages = await prisma.message.groupBy({
      by: ["chatId"],
      where: {
        senderId: { not: currentUserId },
        status: { not: "READ" },
        chat: {
          members: {
            some: { userId: currentUserId }
          }
        }
      },
      _count: {
        id: true
      }
    });

    const counts = unreadMessages.reduce((acc, curr) => {
      acc[curr.chatId] = curr._count.id;
      return acc;
    }, {});

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function markChatAsRead(req, res) {
  try {
    const { id: chatId } = req.params;
    const currentUserId = req.user.id;

    const membership = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: { chatId, userId: currentUserId }
      }
    });

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this chat" });
    }

    const updateResult = await prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: currentUserId },
        status: { not: "READ" }
      },
      data: {
        status: "READ"
      }
    });

    getIo().to(`chat_${chatId}`).emit("messagesRead", {
      chatId,
      readerId: currentUserId
    });

    res.status(200).json({ 
      message: "Chat marked as read", 
      count: updateResult.count 
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}
