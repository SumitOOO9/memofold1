const Post = require("../models/Post");
const User = require("../models/user");
const fs = require('fs');
const path = require('path');

const processBase64Image = (base64String, userId) => {
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `post_${userId}_${Date.now()}.${imageType}`;
    const filePath = path.join(uploadsDir, filename);

    // Save the image
    fs.writeFileSync(filePath, imageData, 'base64');

    // Return the relative path or URL (adjust based on your setup)
    return `/uploads/${filename}`;

  } catch (error) {
    console.error('Error processing base64 image:', error);
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
