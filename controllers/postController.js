// controllers/postController.js
const Post = require("../models/Post");
const User = require("../models/user");
exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Post content cannot be empty" });
    }

    const now = new Date();

    const post = new Post({
      content,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      userId: req.user.id,
      username: req.user.username, // ✅ Add this line
    });

    await post.save();
    res.status(201).json({ message: "Post created successfully", post });
  } catch (err) {
    console.error("Post creation error:", err.message);
    res.status(500).json({ error: "Server error while creating post" });
  }
};


exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find({}).sort({ createdAt: -1 }).lean();

    // Get all unique usernames from posts
    const usernames = [...new Set(posts.map(post => post.username))];

    // Fetch profilePics for those users
    const users = await User.find({ username: { $in: usernames } })
      .select("username profilePic")
      .lean();

    // Create a map: username -> profilePic
    const userMap = {};
    users.forEach(user => {
      userMap[user.username] = user.profilePic || "";
    });

    // Attach profilePic to each post
    const enrichedPosts = posts.map(post => ({
      ...post,
      profilePic: userMap[post.username] || "",
    }));

    res.status(200).json(enrichedPosts);
  } catch (err) {
    console.error("Fetching posts failed:", err.message);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

exports.getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};