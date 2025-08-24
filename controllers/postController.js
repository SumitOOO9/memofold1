const Post = require("../models/Post");
const User = require("../models/user");
const fs = require('fs');
const path = require('path');

const processBase64Image = async (base64String, userId) => {
  if (!base64String || !base64String.startsWith('data:image/')) {
    return null;
  }

  try {
    // Extract image type and data
    const matches = base64String.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const imageType = matches[1];
    const imageData = matches[2];
    
    // Validate image type
    const validImageTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    if (!validImageTypes.includes(imageType.toLowerCase())) {
      return null;
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:image/${imageType};base64,${imageData}`,
      {
        folder: 'posts', // Optional: organize images in folders
        public_id: `post_${userId}_${Date.now()}`,
        resource_type: 'image'
      }
    );

    // Return Cloudinary URL
    return result.secure_url; // or result.url for non-HTTPS

  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return null;
  }
};

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { content, createdAt, image: base64Image } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Post content cannot be empty" });
    }
   
     let imageUrl = "";
    
    // Process base64 image if provided
    if (base64Image && base64Image.startsWith('data:image/')) {
      imageUrl = processBase64Image(base64Image, req.user.id);
      if (!imageUrl) {
        return res.status(400).json({ error: "Invalid image format" });
      }
    }

    const post = new Post({
      content,
      image: imageUrl || "",
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
