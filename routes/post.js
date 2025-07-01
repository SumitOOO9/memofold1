const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const { authenticate } = require("../middleware/authMiddleware"); // ✅ Middleware import

// ✅ Create a new post
router.post("/", authenticate, async (req, res) => {
  const { content, image } = req.body;
  try {
    const newPost = new Post({
      userId: req.user.id,
      username: req.user.username,
      content,
      image
    });
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    console.error("Failed to create post:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ✅ Get all posts (main feed)
router.get("/", authenticate, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Failed to fetch posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ✅ Get posts for a specific user (by username)
router.get("/user/:username", authenticate, async (req, res) => {
  try {
    const userPosts = await Post.find({ username: req.params.username }).sort({ createdAt: -1 });
    res.json(userPosts);
  } catch (err) {
    console.error("Failed to fetch user's posts:", err);
    res.status(500).json({ error: "Failed to fetch user's posts" });
  }
});

module.exports = router;
