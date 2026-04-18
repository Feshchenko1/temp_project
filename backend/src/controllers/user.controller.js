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

    // Diagnostic logging for E2EE public key presence
    if (!user.publicKey) {
      console.warn(`[E2EE] User ${userId} found but has no publicKey.`);
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserById controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getRecommendedUsers(req, res) {
  try {
    const currentUserId = req.user.id;
    
    // Get all friends to exclude them
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
    console.error("Error in getRecommendedUsers controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyFriends(req, res) {
  try {
    const currentUserId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: {
        friends: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
            instrumentsKnown: true,
            instrumentsToLearn: true,
            location: true,
            bio: true,
            spokenLanguages: true,
          }
        }
      }
    });

    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const myId = req.user.id;
    const recipientId = req.params.id;

    if (myId === recipientId) {
      console.error(`[sendFriendRequest] 400: User ${myId} tried to add themselves.`);
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
      console.error(`[sendFriendRequest] 400: User ${myId} is already friends with ${recipientId}.`);
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
      console.error(`[sendFriendRequest] 400: Friend request already exists between ${myId} and ${recipientId}. Status: ${existingRequest.status}`);
      return res.status(400).json({ message: "A friend request already exists between you and this user" });
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
      console.error("Socket error on friend request", err);
    }

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("Error in sendFriendRequest controller", error.message);
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

    await prisma.$transaction(async (tx) => {
      await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: "accepted" }
      });

      await tx.user.update({
        where: { id: friendRequest.senderId },
        data: { friends: { connect: { id: friendRequest.recipientId } } }
      });

      await tx.user.update({
        where: { id: friendRequest.recipientId },
        data: { friends: { connect: { id: friendRequest.senderId } } }
      });

      // Automatically create a PERMANENT 1-on-1 chat
      await tx.chat.create({
        data: {
          isGroup: false,
          chatType: "PERMANENT",
          members: {
            create: [
              { userId: friendRequest.senderId, role: "MEMBER" },
              { userId: friendRequest.recipientId, role: "MEMBER" }
            ]
          }
        }
      });
    });


    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.log("Error in acceptFriendRequest controller", error.message);
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
    console.error("Error in rejectFriendRequest controller", error.message);
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
    console.log("Error in getFriendRequests controller", error.message);
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
    console.log("Error in getOutgoingFriendReqs controller", error.message);
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
      console.error("Socket error on public key update", err);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error in updatePublicKey controller", error.message);
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

    // If profilePic is being updated, delete the old one from storage (Deep Clean)
    if (profilePic !== undefined && profilePic !== null) {
      const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { profilePic: true } });
      if (currentUser?.profilePic && currentUser.profilePic !== profilePic) {
        await deleteFile(currentUser.profilePic);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName, // Required
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
    console.error("Error in updateUserProfile controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;

    // 1. Fetch user data for cleanup (pre-deletion)
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

    // 2. Deep Clean: Purge all files from storage (R2/S3)
    const filesToDelete = [
      user.profilePic,
      ...user.scores.map(s => s.fileUrl)
    ].filter(Boolean);

    // Delete files first. If this fails, we catch it in the outer block.
    await Promise.all(filesToDelete.map(fileUrl => deleteFile(fileUrl)));

    // 3. Database cleanup in a STRICT transaction sequence to avoid self-referencing deadlocks
    await prisma.$transaction(async (tx) => {
      // PHASE A: Disconnect many-to-many self-relations first (CRITICAL FIX)
      await tx.user.update({
        where: { id: userId },
        data: {
          friends: { set: [] },
          friendOf: { set: [] }
        }
      });

      // PHASE B: Clear replyTo references in messages
      await tx.message.updateMany({
        where: { replyTo: { senderId: userId } },
        data: { replyToId: null },
      });

      // PHASE C: Identify and delete 1-on-1 chats (Surgical Ghost Removal)
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

      // PHASE D: Final deletion of the user record
      await tx.user.delete({
        where: { id: userId },
      });
    });

    // 4. Notify friends and active chat members via Socket.io
    const io = getIo();
    if (io) {
      user.friends.forEach(friend => {
        io.to(`user_${friend.id}`).emit("user_deleted", { userId });
      });

      user.chatMembers.forEach(member => {
        io.to(`chat_${member.chatId}`).emit("user_deleted", { userId, chatId: member.chatId });
      });
    }

    // 5. Clear the session cookie ONLY ON ABSOLUTE SUCCESS
    res.clearCookie("jwt");
    res.status(200).json({ success: true, message: "Account deleted successfully and storage purged" });

  } catch (error) {
    console.error("CRITICAL: Error in deleteAccount controller:", error.message);
    // DO NOT clear cookie here. We want the user to stay logged in if deletion failed.
    res.status(500).json({ 
      message: "An error occurred during account deletion. The operation has been rolled back and your session is still active.",
      error: error.message 
    });
  }
}
