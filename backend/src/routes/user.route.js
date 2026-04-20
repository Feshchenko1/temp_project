import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  acceptFriendRequest,
  getFriendRequests,
  getMyFriends,
  getOutgoingFriendReqs,
  getRecommendedUsers,
  sendFriendRequest,
  rejectFriendRequest,
  getUserById,
  updatePublicKey,
  updateUserProfile,
  deleteAccount,
  removeFriend,
} from "../controllers/user.controller.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);
router.get("/friend-requests", getFriendRequests);
router.get("/outgoing-friend-requests", getOutgoingFriendReqs);
router.delete("/friends/:friendId", removeFriend);

router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);
router.delete("/friend-request/:id/reject", rejectFriendRequest);

router.get("/:userId", getUserById);


router.patch("/public-key", updatePublicKey);
router.patch("/profile", updateUserProfile);
router.delete("/profile", deleteAccount);

export default router;
