import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "auto",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.AWS_ENDPOINT
});

export const deleteFile = async (fileUrl) => {
  try {
    if (!fileUrl) return;

    if (fileUrl.includes("dicebear.com")) return;

    const url = new URL(fileUrl);
    const key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
    
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    }));
  } catch (error) {
  }
};