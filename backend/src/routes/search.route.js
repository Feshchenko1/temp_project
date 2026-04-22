import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { globalSearch } from "../controllers/search.controller.js";

const router = express.Router();

router.get("/", protectRoute, globalSearch);

export default router;
