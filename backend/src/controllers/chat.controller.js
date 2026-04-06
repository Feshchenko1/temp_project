import { prisma } from "../lib/db.js";

export async function getChat(req, res) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
          }
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is a member of the chat
    const isMember = chat.members.some(m => m.id === currentUserId);
    if (!isMember) {
      return res.status(403).json({ message: "Unauthorized access to this chat" });
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error("Error in getChat controller", error.message);
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

    // Step 1: Find if a direct chat (isGroup: false) exists between these two users
    let chat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { id: currentUserId } } },
          { members: { some: { id: targetUserId } } }
        ]
      },
      include: {
        members: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
          }
        }
      }
    });

    // Step 2: If not found, create one
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          isGroup: false,
          members: {
            connect: [
              { id: currentUserId },
              { id: targetUserId }
            ]
          }
        },
        include: {
          members: {
            select: {
              id: true,
              fullName: true,
              profilePic: true,
            }
          }
        }
      });
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error("Error in getOrCreateChat controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
