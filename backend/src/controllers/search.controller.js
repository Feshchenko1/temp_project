import { prisma } from "../lib/db.js";

export const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.status(200).json({ users: [], groups: [], scores: [] });
    }

    const searchQuery = { contains: q, mode: "insensitive" };

    const [users, groups, scores, tracks] = await Promise.all([
      prisma.user.findMany({
        where: { fullName: searchQuery },
        select: { id: true, fullName: true, profilePic: true },
        take: 5
      }),
      prisma.chat.findMany({
        where: {
          isGroup: true,
          name: searchQuery,
          members: { some: { userId: currentUserId } }
        },
        select: { id: true, name: true, groupImage: true },
        take: 5
      }),
      prisma.score.findMany({
        where: {
          OR: [ { title: searchQuery }, { artist: searchQuery } ]
        },
        select: { id: true, title: true, artist: true },
        take: 5
      }),
      prisma.track.findMany({
        where: {
          OR: [ { title: searchQuery }, { artist: searchQuery } ]
        },
        select: { id: true, title: true, artist: true, coverUrl: true },
        take: 5
      })
    ]);

    res.status(200).json({ users, groups, scores, tracks });
  } catch (error) {
    console.error("Global search error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
