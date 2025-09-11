require("dotenv").config();
const express = require("express");
const path = require("path");

const authRoutes = require("./routes/auth");
const feedbackRoutes = require("./routes/feedback");
const postRoutes = require("./routes/post");
const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");

const connectDb = require("./config/db");
const securityMiddleware = require("./middleware/security");

const app = express();
const PORT = process.env.PORT || 3000;

connectDb();


securityMiddleware(app);


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.get("/", (req, res) => {
  res.send("MemoFold Backend is live! 🌟");
});

app.get("/api", (req, res) => {
  res.send("API is working ✅");
});


app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/user", userRoutes);
app.use("/api/profile", profileRoutes);


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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
