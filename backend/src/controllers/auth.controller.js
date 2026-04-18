import { prisma } from "../lib/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail } from "../lib/email.js";
export async function signup(req, res) {
  const { email, password, fullName, publicKey, encryptedPrivateKey, cryptoSalt, recoveryEncryptedKey, recoverySalt } = req.body;

  try {
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "Identity fields (email, password, fullName) are required" });
    }

    if (!publicKey || !encryptedPrivateKey || !cryptoSalt || !recoveryEncryptedKey || !recoverySalt) {
      return res.status(400).json({ 
        message: "Cryptographic identity missing. Registration rejected for E2EE compliance." 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists, please use a different one" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const randomSeed = encodeURIComponent(fullName || Math.random().toString(36).substring(7));
    const randomAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;

    const newUser = await prisma.user.create({
      data: {
        email,
        fullName,
        password: hashedPassword,
        profilePic: randomAvatar,
        publicKey,
        encryptedPrivateKey,
        cryptoSalt,
        recoveryEncryptedKey,
        recoverySalt,
      },
    });

    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getRecoveryData(req, res) {
  try {
    const { email } = req.params;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        recoveryEncryptedKey: true,
        recoverySalt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.recoveryEncryptedKey || !user.recoverySalt) {
      return res.status(400).json({ message: "This account predates Dual Vault. Please contact support." });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, newPassword, encryptedPrivateKey, cryptoSalt, recoveryEncryptedKey, recoverySalt } = req.body;

    if (!email || !newPassword || !encryptedPrivateKey || !cryptoSalt || !recoveryEncryptedKey || !recoverySalt) {
      return res.status(400).json({ message: "Missing required cryptographic materials" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        encryptedPrivateKey,
        cryptoSalt,
        recoveryEncryptedKey,
        recoverySalt
      }
    });

    res.status(200).json({ message: "Password reset and Vaults migrated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, res) {
  res.clearCookie("jwt");
  res.status(200).json({ success: true, message: "Logout successful" });
}

export async function onboard(req, res) {
  try {
    const userId = req.user.id;
    const { fullName, bio, instrumentsKnown, instrumentsToLearn, spokenLanguages, location, profilePic } = req.body;

    if (!fullName) {
      return res.status(400).json({
        message: "Full Name is strictly required",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        bio: bio || "",
        instrumentsKnown: instrumentsKnown || [],
        instrumentsToLearn: instrumentsToLearn || [],
        spokenLanguages: spokenLanguages || [],
        location: location || "",
        ...(profilePic && { profilePic }),
        isOnboarded: true,
      },
    });

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updatePublicKey(req, res) {
  try {
    const userId = req.user.id;
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ message: "Public key is required" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { publicKey },
    });

    try {
      getIo().emit("user_key_updated", { userId, publicKey });
    } catch (err) {
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendOTP(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationToken.upsert({
      where: { email },
      update: { code, expiresAt },
      create: { email, code, expiresAt },
    });

    await sendVerificationEmail(email, code);

    res.status(200).json({ message: "Verification code sent." });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}
