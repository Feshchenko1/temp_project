import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getChat, 
  getOrCreateChat, 
  getRecentChats, 
  getChatMessages, 
  deleteMessage, 
  updateMessage,
  togglePinMessage,
  endChatSession,
  getGroupKeys,
  storeGroupKeys,
  getUnreadCounts,
  markChatAsRead
} from "../controllers/chat.controller.js";

const router = express.Router();

router.use(protectRoute);
router.get("/recent", getRecentChats);
router.get("/unread-counts", getUnreadCounts);
router.get("/direct/:targetUserId", getOrCreateChat);
router.get("/:id", getChat);
router.get("/:id/messages", getChatMessages);
router.put("/:id/read", markChatAsRead);
router.delete("/messages/:msgId", deleteMessage);
router.patch("/messages/:msgId", updateMessage);
router.patch("/messages/:msgId/pin", togglePinMessage);
router.delete("/session/:id", endChatSession);
router.get("/keys/:chatId", getGroupKeys);
router.post("/keys", storeGroupKeys);

export default router;

