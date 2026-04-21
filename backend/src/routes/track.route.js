import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getTracks, createTrack, deleteTrack, updateTrack } from "../controllers/track.controller.js";

const router = express.Router();

router.get("/", protectRoute, getTracks);
router.post("/", protectRoute, createTrack);
router.put("/:id", protectRoute, updateTrack);
router.delete("/:id", protectRoute, deleteTrack);

export default router;
