require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const feedbackRoutes = require("./routes/feedback");
const postRoutes = require("./routes/post");
const userRoutes = require("./routes/userRoutes");
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Check for Mongo URI
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in the .env file");
  process.exit(1);
}

// ✅ Safe CORS Setup for Development and Production
const allowedOrigins = [
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://memofold-coral.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer errors (file size, etc)
    return res.status(400).json({ 
      message: "File upload error",
      error: err.message 
    });
  } else if (err) {
    // Other errors
    console.error(err);
    return res.status(500).json({ 
      message: "Internal server error",
      error: err.message 
    });
  }
  next();
});


// Middleware
app.use(express.json());

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, "public"))); 

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test Routes
app.get("/", (req, res) => {
  res.send("MemoFold Backend is live! 🌟");
});

app.get("/api", (req, res) => {
  res.send("API is working ✅");
});

// Register Routes
app.use("/api/auth", authRoutes);
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/posts", postRoutes);
app.use("/api/user", userRoutes);

// MongoDB Connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => {
  console.error("❌ MongoDB connection error:", err.message);
  console.error("Full error:", err);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
