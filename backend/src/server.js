import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import http from "http";
import helmet from "helmet";
import { initializeSocket } from "./lib/socket.js";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import uploadRoutes from "./routes/upload.route.js";
import chatRoutes from "./routes/chat.route.js";
import scoreRoutes from "./routes/score.route.js";
import trackRoutes from "./routes/track.route.js";
import playlistRoutes from "./routes/playlist.route.js";

import { connectDB } from "./lib/db.js";

const app = express();
const server = http.createServer(app);

const io = initializeSocket(server);

const PORT = process.env.PORT || 5001;

const __dirname = path.resolve();

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/tracks", trackRoutes);
app.use("/api/playlists", playlistRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, async () => {
  await connectDB();
});
