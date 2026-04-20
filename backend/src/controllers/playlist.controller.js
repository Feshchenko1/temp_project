import { prisma } from "../lib/db.js";

export const getPlaylists = async (req, res) => {
  try {
    const userId = req.user.id;

    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        tracks: {
          include: {
            track: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    profilePic: true,
                  },
                },
              },
            },
          },
          orderBy: {
            addedAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Flatten tracks for cleaner response
    const formattedPlaylists = playlists.map((p) => ({
      ...p,
      tracks: p.tracks.map((pt) => pt.track),
    }));

    res.status(200).json(formattedPlaylists);
  } catch (error) {
    console.error("Error in getPlaylists: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createPlaylist = async (req, res) => {
  try {
    const { title, description, coverUrl } = req.body;
    const userId = req.user.id;

    if (!title) {
      return res.status(400).json({ message: "Playlist title is required" });
    }

    const playlist = await prisma.playlist.create({
      data: {
        title,
        description,
        coverUrl,
        userId,
      },
    });

    res.status(201).json(playlist);
  } catch (error) {
    console.error("Error in createPlaylist: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addTrackToPlaylist = async (req, res) => {
  try {
    const { playlistId, trackId } = req.params;
    const userId = req.user.id;

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized to modify this playlist" });
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }

    const playlistTrack = await prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
      },
    });

    res.status(200).json(playlistTrack);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Track already in playlist" });
    }
    console.error("Error in addTrackToPlaylist: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const removeTrackFromPlaylist = async (req, res) => {
  try {
    const { playlistId, trackId } = req.params;
    const userId = req.user.id;

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized to modify this playlist" });
    }

    await prisma.playlistTrack.delete({
      where: {
        playlistId_trackId: {
          playlistId,
          trackId,
        },
      },
    });

    res.status(200).json({ message: "Track removed from playlist" });
  } catch (error) {
    console.error("Error in removeTrackFromPlaylist: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await prisma.playlist.findUnique({
      where: { id },
    });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized to delete this playlist" });
    }

    await prisma.playlist.delete({
      where: { id },
    });

    res.status(200).json({ message: "Playlist deleted successfully" });
  } catch (error) {
    console.error("Error in deletePlaylist: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
