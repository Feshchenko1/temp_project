import { prisma } from "../lib/db.js";

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
            instrumentsLearn: true,
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
      return res.status(400).json({ message: "A friend request already exists between you and this user" });
    }

    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: myId,
        recipientId: recipientId,
      },
    });

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

    await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: "accepted" }
      }),
      prisma.user.update({
        where: { id: friendRequest.senderId },
        data: { friends: { connect: { id: friendRequest.recipientId } } }
      }),
      prisma.user.update({
        where: { id: friendRequest.recipientId },
        data: { friends: { connect: { id: friendRequest.senderId } } }
      })
    ]);

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.log("Error in acceptFriendRequest controller", error.message);
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
        sender: { select: { id: true, fullName: true, profilePic: true, instrumentsKnown: true, instrumentsLearn: true } }
      }
    });

    const acceptedReqs = await prisma.friendRequest.findMany({
      where: {
        senderId: currentUserId,
        status: "accepted",
      },
      include: {
        recipient: { select: { id: true, fullName: true, profilePic: true } }
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
        recipient: { select: { id: true, fullName: true, profilePic: true, instrumentsKnown: true, instrumentsLearn: true } }
      }
    });

    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.log("Error in getOutgoingFriendReqs controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
