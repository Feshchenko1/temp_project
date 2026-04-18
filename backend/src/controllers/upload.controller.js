import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../lib/s3.js";
import crypto from "crypto";

export async function getPresignedUrl(req, res) {
  try {
    const { filename, fileType } = req.body;

    const uniqueId = crypto.randomUUID();
    const key = `uploads/${uniqueId}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || "harmonix-bucket",
      Key: key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    const bucketUrl = process.env.R2_PUBLIC_URL || process.env.AWS_PUBLIC_URL || `${process.env.AWS_ENDPOINT}/${process.env.AWS_BUCKET_NAME}`;
    const fileUrl = `${bucketUrl}/${key}`;

    res.status(200).json({
      presignedUrl,
      fileUrl,
      originalName: filename
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}
