import express from "express";
import { getPresignedUrl } from "../controllers/upload.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/presigned-url", protectRoute, getPresignedUrl);

export default router;
