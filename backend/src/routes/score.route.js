import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getPresignedUrlForScore,
  createScore,
  getScores,
  updateScore,
  deleteScore,
  toggleFavorite
} from "../controllers/score.controller.js";

const router = express.Router();

router.get("/", protectRoute, getScores);
router.post("/", protectRoute, createScore);
router.post("/upload/presigned-url", protectRoute, getPresignedUrlForScore);
router.patch("/:id", protectRoute, updateScore);
router.delete("/:id", protectRoute, deleteScore);
router.post("/:id/favorite", protectRoute, toggleFavorite);

export default router;
