const Post = require("../models/Post");
const User = require("../models/user");

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { content, createdAt } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Post content cannot be empty" });
    }
   

    const post = new Post({
      content,
      image: req.imageUrl || "",
      userId: req.user.id,
      username: req.user.username,
      createdAt: createdAt ? new Date(createdAt) : Date.now(), 
    });

    await post.save();
    res.status(201).json({ message: "Post created successfully", post });
  } catch (err) {
    console.error("Post creation error:", err.message);
    res.status(500).json({ error: "Server error while creating post" });
  }
};


// Get all posts (main feed) with user profile populated
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "username realname profilePic",
      })
      .lean();

    res.status(200).json(posts);
  } catch (err) {
    console.error("Fetching posts failed:", err.message);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

// Get posts created by logged-in user
exports.getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "username realname profilePic",
      })
      .lean();

    res.status(200).json(posts);
  } catch (err) {
    console.error("Fetching my posts failed:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
