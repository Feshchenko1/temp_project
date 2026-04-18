import express from "express";
import { login, logout, onboard, signup, getRecoveryData, resetPassword, sendOTP } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { authLimiter, signupLimiter, otpLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/signup", signupLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

router.get("/recovery-data/:email", getRecoveryData);
router.post("/reset-password", authLimiter, resetPassword);

router.post("/send-otp", otpLimiter, sendOTP);

router.post("/onboarding", protectRoute, onboard);

router.get("/me", protectRoute, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;
