require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

// Route imports
const authRoutes = require("./routes/auth");
const feedbackRoutes = require("./routes/feedback");
const postRoutes = require("./routes/post");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// ==============================================
// MongoDB Connection
// ==============================================
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in the .env file");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ==============================================
// CORS Configuration
// ==============================================
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://memofold.vercel.app",
  "https://memofold-frontend-0001.vercel.app" // ✅ added correct deployed domain
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.options("*", cors()); // Preflight support

// ==============================================
// Middleware
// ==============================================
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==============================================
// Routes
// ==============================================
app.get("/", (req, res) => res.send("MemoFold Backend is live! 🌟"));
app.get("/api", (req, res) => res.json({ status: "ok", version: "1.0" }));

app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/user", userRoutes);

// ==============================================
// Start Server
// ==============================================
app.listen(PORT, () => {
  console.log(`
  ==================================
  🚀 Server Running on Port: ${PORT}
  Environment: ${process.env.NODE_ENV || "development"}
  ==================================
  `);
});
