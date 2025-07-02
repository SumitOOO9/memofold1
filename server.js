require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// 1. Database Configuration
// ==============================================
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in the .env file");
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => {
  console.error("❌ MongoDB connection error:", err.message);
  process.exit(1);
});

// ==============================================
// 2. Middleware Setup
// ==============================================
app.use(express.json());

// ✅ CORS Configuration
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://memofold.vercel.app",
  "https://memofold-frontend-0001.vercel.app" // ✅ Your actual deployed frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Static Files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==============================================
// 3. Route Imports
// ==============================================
const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');
const postRoutes = require('./routes/post');
const userRoutes = require('./routes/userRoutes');

// ==============================================
// 4. Route Definitions
// ==============================================
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/user", userRoutes);

// Health Check Endpoints
app.get("/", (req, res) => res.send("MemoFold Backend is live! 🌟"));
app.get("/api", (req, res) => res.json({ 
  status: "active",
  services: ["auth", "posts", "user"]
}));

// ==============================================
// 5. Server Startup
// ==============================================
app.listen(PORT, () => {
  console.log(`
  ==================================
  🚀 Server Running
  Port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  
  Available Routes:
  - Auth:    /api/auth
  - Posts:   /api/posts
  - User:    /api/user
  ==================================
  `);
});
