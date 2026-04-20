import { prisma } from "../lib/db.js";
import { getIo } from "../lib/socket.js";
import { deleteFile } from "../lib/s3.js";

export async function getUserById(req, res) {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        profilePic: true,
        publicKey: true,
        isOnboarded: true,
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.publicKey) {
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getRecommendedUsers(req, res) {
  try {
    const currentUserId = req.user.id;
    
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { friends: true }
    });
    
    const friendIds = currentUser.friends.map(f => f.id);

    const recommendedUsers = await prisma.user.findMany({
      where: {
        id: { notIn: [currentUserId, ...friendIds] },
        isOnboarded: true,
      },
      select: {
        id: true,
        fullName: true,
        profilePic: true,
        instrumentsKnown: true,
        instrumentsToLearn: true,
        spokenLanguages: true,
        location: true,
        bio: true,
      }
    });
    
    res.status(200).json(recommendedUsers);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyFriends(req, res) {
  try {
    const currentUserId = req.user.id;
    
    // Find all accepted friend requests involving the current user
    const friendRequests = await prisma.friendRequest.findMany({
      where: {
        OR: [
          { senderId: currentUserId, status: "accepted" },
          { recipientId: currentUserId, status: "accepted" },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
            instrumentsKnown: true,
            instrumentsToLearn: true,
            location: true,
            bio: true,
            spokenLanguages: true,
            publicKey: true,
          },
        },
        recipient: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
            instrumentsKnown: true,
            instrumentsToLearn: true,
            location: true,
            bio: true,
            spokenLanguages: true,
            publicKey: true,
          },
        },
      },
    });

    // Extract the other user from each friend request
    const friends = friendRequests.map((friendReq) =>
      friendReq.senderId === currentUserId ? friendReq.recipient : friendReq.sender
    );

    res.status(200).json(friends);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const myId = req.user.id;
    const recipientId = req.params.id;

    if (myId === recipientId) {
      return res.status(400).json({ message: "You can't send friend request to yourself" });
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      include: { friends: true }
    });

    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    if (recipient.friends.some(f => f.id === myId)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: myId, recipientId: recipientId },
          { senderId: recipientId, recipientId: myId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "accepted" || existingRequest.status === "rejected") {
        await prisma.friendRequest.delete({ where: { id: existingRequest.id } });
      } else {
        return res.status(400).json({ message: "A friend request already exists between you and this user" });
      }
    }

    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: myId,
        recipientId: recipientId,
      },
    });

    try {
      const io = getIo();
      if (io) {
        io.to(`user_${recipientId}`).emit("new_friend_request", {
          type: "friend_request",
          requestId: friendRequest.id
        });
      }
    } catch (err) {
    }

    res.status(201).json(friendRequest);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const requestId = req.params.id;
    const currentUserId = req.user.id;

    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.recipientId !== currentUserId) {
      return res.status(403).json({ message: "You are not authorized to accept this request" });
    }

    // Double-click protection: if it's already accepted, just return.
    if (friendRequest.status === "accepted") {
      return res.status(200).json({ message: "Friend request already accepted" });
    }

    // Idempotency check: see if a 1-on-1 chat already exists between these two users
    const existingChat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: friendRequest.senderId } } },
          { members: { some: { userId: friendRequest.recipientId } } }
        ]
      }
    });

    const finalChat = await prisma.$transaction(async (tx) => {
      // Safe update to avoid race conditions causing errors
      const updateResult = await tx.friendRequest.updateMany({
        where: { id: requestId, status: "pending" },
        data: { status: "accepted" }
      });

      // If count is 0, it means it was altered (accepted/deleted) by another concurrent request
      if (updateResult.count === 0 && friendRequest.status === "pending") {
        return null;
      }

      await tx.user.update({
        where: { id: friendRequest.senderId },
        data: { friends: { connect: { id: friendRequest.recipientId } } }
      });

      await tx.user.update({
        where: { id: friendRequest.recipientId },
        data: { friends: { connect: { id: friendRequest.senderId } } }
      });

      let chat;
      // Only create a new chat if one doesn't exist
      if (!existingChat) {
        chat = await tx.chat.create({
          data: {
            isGroup: false,
            chatType: "PERMANENT",
            members: {
              create: [
                { userId: friendRequest.senderId, role: "MEMBER" },
                { userId: friendRequest.recipientId, role: "MEMBER" }
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
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        });
      } else {
        chat = await tx.chat.findUnique({
          where: { id: existingChat.id },
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
              take: 1
            }
          }
        });
      }
      return chat;
    });

    if (!finalChat) {
      return res.status(200).json({ message: "Friend request already handled" });
    }

    // Format chat exactly like getRecentChats
    const formattedChat = {
      ...finalChat,
      otherMember: finalChat.members.find(m => m.userId !== currentUserId)?.user || null,
      lastMessage: finalChat.messages[0] || null,
      members: finalChat.members.map(m => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    };

    res.status(200).json({ 
      message: "Friend request accepted",
      chat: formattedChat
    });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function rejectFriendRequest(req, res) {
  try {
    const requestId = req.params.id;
    const currentUserId = req.user.id;

    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.recipientId !== currentUserId) {
      return res.status(403).json({ message: "You are not authorized to reject this request" });
    }

    await prisma.friendRequest.delete({
      where: { id: requestId }
    });

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFriendRequests(req, res) {
  try {
    const currentUserId = req.user.id;
    const incomingReqs = await prisma.friendRequest.findMany({
      where: {
        recipientId: currentUserId,
        status: "pending",
      },
      include: {
        sender: { select: { id: true, fullName: true, profilePic: true, instrumentsKnown: true, instrumentsToLearn: true, location: true, bio: true, spokenLanguages: true } }
      }
    });

    const acceptedReqs = await prisma.friendRequest.findMany({
      where: {
        senderId: currentUserId,
        status: "accepted",
      },
      include: {
        recipient: { select: { id: true, fullName: true, profilePic: true, location: true, bio: true, spokenLanguages: true } }
      }
    });

    res.status(200).json({ incomingReqs, acceptedReqs });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    const currentUserId = req.user.id;
    const outgoingRequests = await prisma.friendRequest.findMany({
      where: {
        senderId: currentUserId,
        status: "pending",
      },
      include: {
        recipient: { select: { id: true, fullName: true, profilePic: true, instrumentsKnown: true, instrumentsToLearn: true, location: true, bio: true, spokenLanguages: true } }
      }
    });

    res.status(200).json(outgoingRequests);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updatePublicKey(req, res) {
  try {
    const userId = req.user.id;
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ message: "Public key is required" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { publicKey },
    });

    try {
      getIo().emit("user_key_updated", { userId, publicKey });
    } catch (err) {
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateUserProfile(req, res) {
  try {
    const userId = req.user.id;
    const { fullName, bio, instrumentsKnown, instrumentsToLearn, spokenLanguages, location, profilePic } = req.body;

    if (!fullName) {
      return res.status(400).json({
        message: "Full Name is strictly required",
      });
    }

    if (profilePic !== undefined && profilePic !== null) {
      const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { profilePic: true } });
      if (currentUser?.profilePic && currentUser.profilePic !== profilePic) {
        await deleteFile(currentUser.profilePic);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        ...(bio !== undefined && { bio }),
        ...(instrumentsKnown !== undefined && { instrumentsKnown }),
        ...(instrumentsToLearn !== undefined && { instrumentsToLearn }),
        ...(spokenLanguages !== undefined && { spokenLanguages }),
        ...(location !== undefined && { location }),
        ...(profilePic !== undefined && { profilePic }),
      },
    });

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        scores: { select: { fileUrl: true } },
        friends: { select: { id: true } },
        chatMembers: { select: { chatId: true } }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const filesToDelete = [
      user.profilePic,
      ...user.scores.map(s => s.fileUrl)
    ].filter(Boolean);
    await Promise.all(filesToDelete.map(fileUrl => deleteFile(fileUrl)));

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          friends: { set: [] },
          friendOf: { set: [] }
        }
      });

      await tx.message.updateMany({
        where: { replyTo: { senderId: userId } },
        data: { replyToId: null },
      });

      const chatsToDelete = await tx.chat.findMany({
        where: {
          isGroup: false,
          members: { some: { userId } }
        },
        select: { id: true }
      });

      if (chatsToDelete.length > 0) {
        await tx.chat.deleteMany({
          where: { id: { in: chatsToDelete.map(c => c.id) } }
        });
      }

      await tx.user.delete({
        where: { id: userId },
      });
    });

    const io = getIo();
    if (io) {
      user.friends.forEach(friend => {
        io.to(`user_${friend.id}`).emit("user_deleted", { userId });
      });

      user.chatMembers.forEach(member => {
        io.to(`chat_${member.chatId}`).emit("user_deleted", { userId, chatId: member.chatId });
      });
    }

    res.clearCookie("jwt");
    res.status(200).json({ success: true, message: "Account deleted successfully and storage purged" });

  } catch (error) {
    res.status(500).json({ 
      message: "An error occurred during account deletion. The operation has been rolled back and your session is still active.",
      error: error.message 
    });
  }
}

export async function removeFriend(req, res) {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user.id;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: currentUserId },
        data: { friends: { disconnect: { id: friendId } } }
      });

      await tx.user.update({
        where: { id: friendId },
        data: { friends: { disconnect: { id: currentUserId } } }
      });

      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: currentUserId, recipientId: friendId },
            { senderId: friendId, recipientId: currentUserId },
          ]
        }
      });

      const sharedChat = await tx.chat.findFirst({
        where: {
          isGroup: false,
          AND: [
            { members: { some: { userId: currentUserId } } },
            { members: { some: { userId: friendId } } }
          ]
        }
      });

      if (sharedChat) {
        await tx.chat.delete({
          where: { id: sharedChat.id }
        });
        
        // Store chatId for emission after transaction
        req.deletedChatId = sharedChat.id;
      }
    });

    const io = getIo();
    if (io && req.deletedChatId) {
      io.to(`user_${currentUserId}`).emit("chat_deleted", { chatId: req.deletedChatId });
      io.to(`user_${friendId}`).emit("chat_deleted", { chatId: req.deletedChatId });
    }

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}
