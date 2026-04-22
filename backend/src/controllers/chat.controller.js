import { prisma } from "../lib/db.js";
import { deleteFile } from "../lib/s3.js";
import { getIo } from "../lib/socket.js";
import { uploadBase64Image } from "../lib/upload.js";


export async function createGroupChat(req, res) {
  try {
    const { name, memberIds, groupKeys, groupImage } = req.body;
    const currentUserId = req.user.id;

    if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
      return res.status(400).json({ message: "Invalid payload: need a name and at least 2 members" });
    }

    if (!memberIds.includes(currentUserId)) {
      return res.status(400).json({ message: "Creator must be a member of the group" });
    }

    if (!groupKeys || !Array.isArray(groupKeys)) {
      return res.status(400).json({ message: "Group keys are required for E2EE" });
    }

    let imageUrl = null;
    if (groupImage) {
      imageUrl = await uploadBase64Image(groupImage, "groups");
    }

    const newChat = await prisma.$transaction(async (tx) => {
      const chat = await tx.chat.create({
        data: {
          isGroup: true,
          name,
          groupImage: imageUrl,
          chatType: "PERMANENT",
          members: {
            create: memberIds.map(userId => ({
              userId,
              role: userId === currentUserId ? "ADMIN" : "MEMBER"
            }))
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

      await tx.groupKey.createMany({
        data: groupKeys.map(k => ({
          chatId: chat.id,
          senderId: currentUserId,
          recipientId: k.recipientId,
          encryptedAesKey: k.encryptedKey || k.encryptedAesKey,
        }))
      });

      return chat;
    });

    const formattedChat = {
      ...newChat,
      members: newChat.members.map(m => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    };

    const io = getIo();
    if (io) {
      memberIds.forEach(userId => {
        if (userId !== currentUserId) {
          io.to(`user_${userId}`).emit("new_group_chat", formattedChat);
        }
      });
    }

    res.status(201).json(formattedChat);
  } catch (error) {
    console.error("Error in createGroupChat:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

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
      isCallActive: !!chat.activeCallId,
      isPinnedToNavbar: chat.members.find(m => m.userId === currentUserId)?.isPinnedToNavbar || false,
      isPinnedToSidebar: chat.members.find(m => m.userId === currentUserId)?.isPinnedToSidebar || false,
      members: chat.members.map(m => ({
        ...m.user,
        role: m.role,
        isPinnedToNavbar: m.isPinnedToNavbar,
        isPinnedToSidebar: m.isPinnedToSidebar,
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
      isCallActive: !!chat.activeCallId,
      isPinnedToNavbar: chat.members.find(m => m.userId === currentUserId)?.isPinnedToNavbar || false,
      isPinnedToSidebar: chat.members.find(m => m.userId === currentUserId)?.isPinnedToSidebar || false,
      members: chat.members.map(m => ({
        ...m.user,
        role: m.role,
        isPinnedToNavbar: m.isPinnedToNavbar,
        isPinnedToSidebar: m.isPinnedToSidebar,
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
      take: 50
    });

    const formattedChats = chats.map(chat => {
      const otherMember = chat.isGroup 
        ? null 
        : chat.members.find(m => m.userId !== currentUserId)?.user;

      return {
        ...chat,
        otherMember,
        isCallActive: !!chat.activeCallId,
        isPinnedToNavbar: chat.members.find(m => m.userId === currentUserId)?.isPinnedToNavbar || false,
        isPinnedToSidebar: chat.members.find(m => m.userId === currentUserId)?.isPinnedToSidebar || false,
        lastMessage: chat.messages[0] || null,
        members: chat.members.map(m => ({
          ...m.user,
          role: m.role,
          isPinnedToNavbar: m.isPinnedToNavbar,
          isPinnedToSidebar: m.isPinnedToSidebar,
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

    const memberships = await prisma.chatMember.findMany({
      where: { userId: currentUserId },
      select: { chatId: true, isMuted: true }
    });

    const counts = {};
    for (const m of memberships) {
      counts[m.chatId] = { count: 0, isMuted: m.isMuted };
    }

    for (const msg of unreadMessages) {
      if (counts[msg.chatId]) {
        counts[msg.chatId].count = msg._count.id;
      }
    }

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

export async function toggleMuteChat(req, res) {
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

    const updated = await prisma.chatMember.update({
      where: {
        chatId_userId: { chatId, userId: currentUserId }
      },
      data: {
        isMuted: !membership.isMuted
      }
    });

    res.status(200).json({ message: "Mute status updated", isMuted: updated.isMuted });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function togglePinChat(req, res) {
  try {
    const { id: chatId } = req.params;
    const currentUserId = req.user.id;

    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: currentUserId } }
    });

    if (!membership) return res.status(403).json({ message: "Not a member" });

    const updated = await prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId: currentUserId } },
      data: { isPinnedToNavbar: !membership.isPinnedToNavbar }
    });

    res.status(200).json({ message: "Pin status updated", isPinnedToNavbar: updated.isPinnedToNavbar });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function leaveChat(req, res) {
  try {
    const { id: chatId } = req.params;
    const currentUserId = req.user.id;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true }
    });

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const isMember = chat.members.some(m => m.userId === currentUserId);
    if (!isMember) return res.status(403).json({ message: "Not a member of this chat" });

    await prisma.chatMember.delete({
      where: {
        chatId_userId: { chatId, userId: currentUserId }
      }
    });

    if (!chat.isGroup || chat.members.length === 1) {
      const remainingMembers = chat.members.length - 1;
      if (remainingMembers === 0) {
        await prisma.chat.delete({ where: { id: chatId } });
      }
    }

    res.status(200).json({ message: "Left chat successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function addGroupMembers(req, res) {
  try {
    const { id: chatId } = req.params;
    const { memberIds, groupKeys } = req.body;
    const currentUserId = req.user.id;

    if (!memberIds || !Array.isArray(memberIds) || !groupKeys || !Array.isArray(groupKeys)) {
      return res.status(400).json({ message: "Invalid payload: need memberIds and groupKeys" });
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true }
    });

    if (!chat || !chat.isGroup) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const isMember = chat.members.some(m => m.userId === currentUserId);
    if (!isMember) {
      return res.status(403).json({ message: "Unauthorized: must be a member to add others" });
    }

    const newMembers = await prisma.$transaction(async (tx) => {
      const existingUserIds = chat.members.map(m => m.userId);
      const uniqueNewMemberIds = memberIds.filter(id => !existingUserIds.includes(id));

      if (uniqueNewMemberIds.length === 0) return [];

      await tx.chatMember.createMany({
        data: uniqueNewMemberIds.map(userId => ({
          chatId,
          userId,
          role: "MEMBER"
        }))
      });

      await tx.groupKey.deleteMany({
        where: {
          chatId,
          recipientId: { in: uniqueNewMemberIds }
        }
      });

      await tx.groupKey.createMany({
        data: groupKeys
          .filter(k => uniqueNewMemberIds.includes(k.recipientId))
          .map(k => ({
            chatId,
            senderId: currentUserId,
            recipientId: k.recipientId,
            encryptedAesKey: k.encryptedKey || k.encryptedAesKey
          }))
      });

      return uniqueNewMemberIds;
    });

    if (newMembers.length > 0) {
      const updatedChat = await prisma.chat.findUnique({
        where: { id: chatId },
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

      const formattedChat = {
        ...updatedChat,
        members: updatedChat.members.map(m => ({
          ...m.user,
          role: m.role,
          joinedAt: m.joinedAt
        }))
      };

      const io = getIo();
      if (io) {
        newMembers.forEach(userId => {
          io.to(`user_${userId}`).emit("new_group_chat", formattedChat);
        });
        io.to(`chat_${chatId}`).emit("group_members_added", {
          chatId,
          newMembers: formattedChat.members.filter(m => newMembers.includes(m.id))
        });
      }
    }

    res.status(200).json({ message: `${newMembers.length} members added successfully`, addedCount: newMembers.length });
  } catch (error) {
    console.error("Error in addGroupMembers:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function removeGroupMember(req, res) {
  try {
    const { id: chatId, memberId: memberIdToRemove } = req.params;
    const currentUserId = req.user.id;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true }
    });

    if (!chat || !chat.isGroup) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const requesterMember = chat.members.find(m => m.userId === currentUserId);
    if (!requesterMember) {
      return res.status(403).json({ message: "Not a member of this chat" });
    }

    const isRequesterAdmin = requesterMember.role === "ADMIN";
    const isSelfRemoval = currentUserId === memberIdToRemove;

    if (!isRequesterAdmin && !isSelfRemoval) {
      return res.status(403).json({ message: "Unauthorized: only Admins can remove members" });
    }

    const memberExists = chat.members.some(m => m.userId === memberIdToRemove);
    if (!memberExists) {
      return res.status(404).json({ message: "Target member is not in this group" });
    }

    await prisma.$transaction([
      prisma.chatMember.delete({
        where: {
          chatId_userId: { chatId, userId: memberIdToRemove }
        }
      }),
      prisma.groupKey.deleteMany({
        where: {
          chatId,
          recipientId: memberIdToRemove
        }
      })
    ]);

    const io = getIo();
    if (io) {
      io.to(`user_${memberIdToRemove}`).emit("removed_from_group", { chatId });
      io.to(`user_${memberIdToRemove}`).emit("chat_deleted", { chatId });
      io.to(`chat_${chatId}`).emit("group_member_removed", { chatId, userId: memberIdToRemove });
    }

    const remainingMembersCount = await prisma.chatMember.count({
      where: { chatId }
    });

    if (remainingMembersCount === 0) {
      await prisma.chat.delete({
        where: { id: chatId }
      });
      console.log(`Chat ${chatId} deleted as it has no members remaining.`);
    }

    res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error in removeGroupMember:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateGroupDetails(req, res) {
  try {
    const { id: chatId } = req.params;
    const { name, groupImage } = req.body;
    const currentUserId = req.user.id;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: true
      }
    });

    if (!chat || !chat.isGroup) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const requesterMember = chat.members.find(m => m.userId === currentUserId);
    if (!requesterMember || requesterMember.role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized: Only Admins can edit group details" });
    }

    let updatedImageUrl = chat.groupImage;
    if (groupImage && groupImage !== chat.groupImage) {
      if (groupImage.startsWith("data:")) {
        updatedImageUrl = await uploadBase64Image(groupImage, "group-avatars");
      } else {
        updatedImageUrl = groupImage;
      }
    }

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        name: name || chat.name,
        groupImage: updatedImageUrl
      }
    });

    const io = getIo();
    if (io) {
      io.to(`chat_${chatId}`).emit("group_details_updated", {
        chatId,
        name: updatedChat.name,
        groupImage: updatedChat.groupImage
      });
    }

    res.status(200).json(updatedChat);
  } catch (error) {
    console.error("Error in updateGroupDetails:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function togglePinChatSidebar(req, res) {
  try {
    const { id: chatId } = req.params;
    const currentUserId = req.user.id;

    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: currentUserId } }
    });

    if (!membership) return res.status(403).json({ message: "Not a member" });

    const updated = await prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId: currentUserId } },
      data: { isPinnedToSidebar: !membership.isPinnedToSidebar }
    });

    res.status(200).json({ message: "Sidebar pin status updated", isPinnedToSidebar: updated.isPinnedToSidebar });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

