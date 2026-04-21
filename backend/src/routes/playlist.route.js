import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getPlaylists,
  createPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist,
  toggleLikedTrack,
} from "../controllers/playlist.controller.js";

const router = express.Router();

router.get("/", protectRoute, getPlaylists);
router.post("/", protectRoute, createPlaylist);
router.post("/:playlistId/tracks/:trackId", protectRoute, addTrackToPlaylist);
router.delete("/:playlistId/tracks/:trackId", protectRoute, removeTrackFromPlaylist);
router.delete("/:id", protectRoute, deletePlaylist);
router.post("/liked/:trackId", protectRoute, toggleLikedTrack);

export default router;
