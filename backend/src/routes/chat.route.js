import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getChat, getOrCreateChat } from "../controllers/chat.controller.js";

const router = express.Router();

router.use(protectRoute);
router.get("/direct/:targetUserId", getOrCreateChat);
router.get("/:id", getChat);

export default router;
