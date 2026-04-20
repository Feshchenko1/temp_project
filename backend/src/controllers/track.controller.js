import { prisma } from "../lib/db.js";
import { deleteFile } from "../lib/s3.js";

export const getTracks = async (req, res) => {
  try {
    const tracks = await prisma.track.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(tracks);
  } catch (error) {
    console.error("Error in getTracks: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createTrack = async (req, res) => {
  try {
    const { title, artist, fileUrl, coverUrl } = req.body;
    const userId = req.user.id;

    if (!title || !artist || !fileUrl) {
      return res.status(400).json({ message: "All fields except coverUrl are required" });
    }

    const track = await prisma.track.create({
      data: {
        title,
        artist,
        fileUrl,
        coverUrl,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
          },
        },
      },
    });

    res.status(201).json(track);
  } catch (error) {
    console.error("Error in createTrack: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const track = await prisma.track.findUnique({
      where: { id },
    });

    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }

    if (track.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized to delete this track" });
    }

    // S3 Cleanup
    if (track.fileUrl) {
      await deleteFile(track.fileUrl);
    }
    if (track.coverUrl) {
      await deleteFile(track.coverUrl);
    }

    await prisma.track.delete({
      where: { id },
    });

    res.status(200).json({ message: "Track deleted successfully" });
  } catch (error) {
    console.error("Error in deleteTrack: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
