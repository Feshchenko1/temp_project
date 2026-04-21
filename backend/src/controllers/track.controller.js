import { prisma } from "../lib/db.js";
import { deleteFile } from "../lib/s3.js";

export const getTracks = async (req, res) => {
  try {
    const { cursor, search, limit = 20 } = req.query;
    const take = parseInt(limit);

    const whereClause = search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { artist: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const totalCount = await prisma.track.count({ where: whereClause });

    const tracks = await prisma.track.findMany({
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: whereClause,
      include: { user: { select: { id: true, fullName: true, profilePic: true } } },
      orderBy: { id: "asc" },
    });

    const nextCursor = tracks.length === take ? tracks[tracks.length - 1].id : null;

    res.status(200).json({ tracks, nextCursor, totalCount });
  } catch (error) {
    console.error("Error in getTracks: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createTrack = async (req, res) => {
  try {
    const { title, artist, fileUrl, coverUrl, duration } = req.body;
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
        duration: duration || 0,
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

export const updateTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, coverUrl } = req.body;
    const userId = req.user.id;

    const track = await prisma.track.findUnique({ where: { id } });
    if (!track) return res.status(404).json({ message: "Track not found" });
    if (track.userId !== userId) return res.status(403).json({ message: "Unauthorized" });

    // Clean up old cover if a new one is provided
    if (coverUrl && track.coverUrl && coverUrl !== track.coverUrl) {
      await deleteFile(track.coverUrl).catch(() => console.log("Failed to delete old cover"));
    }

    const updatedTrack = await prisma.track.update({
      where: { id },
      data: {
        title: title || track.title,
        artist: artist || track.artist,
        ...(coverUrl && { coverUrl }) // Only update if provided
      }
    });

    res.status(200).json(updatedTrack);
  } catch (error) {
    console.error("Error in updateTrack: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
