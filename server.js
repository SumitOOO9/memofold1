require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require('./swagger-output.json');
const authRoutes = require("./routes/auth");
const feedbackRoutes = require("./routes/feedback");
const postRoutes = require("./routes/post");
const userRoutes = require("./routes/userRoutes");
const friendRoutes = require("./routes/friendRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const chatRoutes = require("./routes/chatRoutes");
const pushRoutes = require("./routes/pushRoute");
const cookieParser = require("cookie-parser");

// const profileRoutes = require("./routes/profileRoutes");

const connectDb = require("./config/db");
const securityMiddleware = require("./middleware/security");

const app = express();

const server = http.createServer(app);  
const io = new Server(server, {
  cors: {
    origin: "*",   
    methods: ["GET", "POST"]
  }
});
const onlineUsers = new Map();

const PORT = process.env.PORT || 3000;

connectDb();

app.use(cookieParser());
securityMiddleware(app);


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.get("/", (req, res) => {
  res.send("MemoFold Backend is live! 🌟");
});

app.get("/api", (req, res) => {
  res.send("API is working ✅");
});


app.use("/api/auth", authRoutes);
app.use("/api/contact", feedbackRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/user", userRoutes);
app.use("/api/friends", friendRoutes)
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/push", pushRoutes);
// app.use("/api/profile", profileRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));



app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  if (err.name === "MulterError") {
    return res.status(400).json({
      message: "File upload error",
      error: err.message,
    });
  }

  res.status(500).json({
    message: "Internal server error",
    error: err.message,
  });
});

io.on("connection", (socket) => {
  // console.log("⚡ New client connected:", socket.id);

  // Join per-user room
  socket.on("join", (userId) => {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} joined their room`);
  });

  // Send generic notification
  socket.on("sendNotification", ({ receiverId, message }) => {
    io.to(receiverId).emit("notification", { message });
    console.log(`📨 Sent notification to ${receiverId}: ${message}`);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
    // Remove from online users
    for (let [userId, sId] of onlineUsers.entries()) {
      if (sId === socket.id) onlineUsers.delete(userId);
    }
  });
});
app.set("io", io);
app.set("onlineUsers", onlineUsers);


server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
});
