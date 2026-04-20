import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, deleteFile } from "../lib/s3.js";
import { prisma } from "../lib/db.js";
import crypto from "crypto";

export const getPresignedUrlForScore = async (req, res) => {
  try {
    const { filename, fileType } = req.body;
    
    if (!fileType.includes("pdf") && !fileType.startsWith("audio/")) {
      return res.status(400).json({ message: "Only PDF and Audio files are allowed for scores." });
    }

    const uniqueId = crypto.randomUUID();
    const key = `scores/${uniqueId}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || "harmonix-bucket",
      Key: key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const bucketUrl = process.env.R2_PUBLIC_URL || process.env.AWS_PUBLIC_URL || `${process.env.AWS_ENDPOINT}/${process.env.AWS_BUCKET_NAME}`;
    const fileUrl = `${bucketUrl}/${key}`;

    res.status(200).json({ presignedUrl, fileUrl, key });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createScore = async (req, res) => {
  try {
    const { title, artist, fileUrl, audioUrl, fileSize, pagesCount, tags } = req.body;
    const userId = req.user.id;

    const score = await prisma.score.create({
      data: {
        title,
        artist,
        fileUrl,
        audioUrl,
        fileSize,
        pagesCount,
        userId,
        tags: {
          create: tags?.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName }
              }
            }
          })) || []
        }
      },
      include: {
        tags: { include: { tag: true } }
      }
    });

    res.status(201).json(score);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getScores = async (req, res) => {
  try {
    const { search, tag, userId, favoritesOnly } = req.query;
    const currentUserId = req.user.id;

    const where = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { artist: { contains: search, mode: "insensitive" } }
      ];
    }

    if (tag) {
      const tagNames = tag.split(",");
      where.tags = { 
        some: { 
          tag: { 
            name: { in: tagNames } 
          } 
        } 
      };
    }

    if (userId) {
      where.userId = userId;
    }

    if (favoritesOnly === "true") {
      where.favoritedBy = { some: { userId: currentUserId } };
    }

    const scores = await prisma.score.findMany({
      where,
      include: {
        user: { select: { fullName: true, profilePic: true } },
        tags: { include: { tag: true } },
        _count: {
          select: { favoritedBy: true }
        },
        favoritedBy: {
          where: { userId: currentUserId }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formattedScores = scores.map(score => ({
      ...score,
      isFavorite: score.favoritedBy.length > 0,
      tags: score.tags.map(t => t.tag.name)
    }));

    res.status(200).json(formattedScores);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, audioUrl, tags } = req.body;
    const userId = req.user.id;

    const existingScore = await prisma.score.findUnique({ where: { id } });
    if (!existingScore || existingScore.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized to update this score" });
    }

    await prisma.scoreTag.deleteMany({ where: { scoreId: id } });

    const updatedScore = await prisma.score.update({
      where: { id },
      data: {
        title,
        artist,
        audioUrl,
        tags: tags ? {
          create: tags.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName }
              }
            }
          }))
        } : undefined
      },
      include: {
        user: { select: { fullName: true, profilePic: true } },
        tags: { include: { tag: true } },
        _count: {
          select: { favoritedBy: true }
        },
        favoritedBy: {
          where: { userId }
        }
      }
    });

    const formattedScore = {
      ...updatedScore,
      isFavorite: updatedScore.favoritedBy.length > 0,
      tags: updatedScore.tags.map(t => t.tag.name)
    };

    res.status(200).json(formattedScore);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteScore = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingScore = await prisma.score.findUnique({ where: { id } });
    if (!existingScore || existingScore.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized to delete this score" });
    }

    if (existingScore.fileUrl) {
      await deleteFile(existingScore.fileUrl);
    }

    if (existingScore.audioUrl) {
      await deleteFile(existingScore.audioUrl);
    }

    await prisma.score.delete({ where: { id } });
    res.status(200).json({ message: "Score deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingFavorite = await prisma.favoriteScore.findUnique({
      where: {
        userId_scoreId: { userId, scoreId: id }
      }
    });

    if (existingFavorite) {
      await prisma.favoriteScore.delete({
        where: {
          userId_scoreId: { userId, scoreId: id }
        }
      });
      return res.status(200).json({ message: "Removed from favorites", isFavorite: false });
    } else {
      await prisma.favoriteScore.create({
        data: { userId, scoreId: id }
      });
      return res.status(200).json({ message: "Added to favorites", isFavorite: true });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
