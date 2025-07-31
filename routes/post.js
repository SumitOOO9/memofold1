const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const postController = require("../controllers/postController");

// Create a new post
router.post("/", authenticate, postController.createPost);

// Get all posts (main feed)
router.get("/", authenticate, postController.getPosts);

// Get posts for a specific user by username
router.get("/user/:username", authenticate, async (req, res) => {
  const Post = require("../models/Post");

  try {
    const posts = await Post.find({ username: req.params.username })
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "username realname profilePic",
      })
      .lean();

    res.status(200).json(posts);
  } catch (err) {
    console.error("Failed to fetch user's posts:", err.message);
    res.status(500).json({ error: "Failed to fetch user's posts" });
  }
});

module.exports = router;
