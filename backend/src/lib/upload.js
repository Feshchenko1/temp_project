import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./s3.js";
import crypto from "crypto";

/**
 * @param {string} base64String
 * @param {string} folder
 * @returns {Promise<string>}
 */
export async function uploadBase64Image(base64String, folder = "uploads") {
  if (!base64String) return null;

  try {
    const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 string");
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const extension = contentType.split("/")[1] || "png";
    const filename = `${crypto.randomUUID()}.${extension}`;
    const key = `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || "harmonix-bucket",
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    const bucketUrl = process.env.R2_PUBLIC_URL || process.env.AWS_PUBLIC_URL || `${process.env.AWS_ENDPOINT}/${process.env.AWS_BUCKET_NAME}`;
    return `${bucketUrl}/${key}`;
  } catch (error) {
    console.error("Base64 upload error:", error);
    throw new Error("Failed to upload image to storage");
  }
}
