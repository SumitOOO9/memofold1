const PostService = require('../service/postService');

exports.createPost = async (req, res) => {
  try {
    const { content, createdAt, image: base64Image } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Post content cannot be empty" });
    }

    const post = await PostService.createPost(
      req.user.id, 
      req.user.username, 
      content, 
      base64Image, 
      createdAt
    );

    res.status(201).json({ message: "Post created successfully", post });
  } catch (err) {
    console.error("Post creation error:", err.message);
    
    if (err.message === "Invalid image format") {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: "Server error while creating post" });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const { limit = 10, cursor } = req.query;
    const posts = await PostService.getAllPosts(Number(limit), cursor);
    res.status(200).json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ My Posts
exports.getMyPosts = async (req, res) => {
  try {
    const { limit = 10, cursor } = req.query;
    const posts = await PostService.getUserPosts(req.user.id, Number(limit), cursor);
    res.status(200).json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Posts by Username
exports.getPostsByUsername = async (req, res) => {
  try {
    const { limit = 10, cursor } = req.query;
    const posts = await PostService.getPostsByUsername(req.params.username, Number(limit), cursor);
    res.status(200).json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.likePost = async (req, res) => {
  try {
    const post = await PostService.likePost(req.params.id, req.user.id);

    res.json({ success: true, likes: post.likes });
  } catch (err) {
    console.error('Like error:', err);

    if (err.message === "Post not found" || err.message === "User not found") {
      return res.status(404).json({ error: err.message });
    }

    res.status(500).json({ error: "Server error" });
  }
};


exports.getPostForEdit = async (req, res) => {
  try {
    const post = await PostService.getPostById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    res.json({
      success: true,
      message: "Post fetched successfully",
      post: post
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching post for editing"
    });
  }
};

exports.getPostLikes = async (req, res) => {
  try {
    const { limit = 20, cursor } = req.query;
    const likes = await PostService.getPostLikes(req.params.id, Number(limit), cursor);
    res.status(200).json({ success: true, likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updatePost = async (req, res) => {
  try {
    const { content, image: base64Image } = req.body;
    let updateData = { content };

    if (base64Image) {
      if (base64Image === 'remove') {
        updateData.image = "";
      } else if (base64Image.startsWith('data:image/')) {
        const imageUrl = await UploadService.processBase64Image(base64Image, req.user.id);
        if (!imageUrl) {
          return res.status(400).json({
            success: false,
            message: "Invalid image format"
          });
        }
        updateData.image = imageUrl;
      } else {
        updateData.image = base64Image;
      }
    }

    const updatedPost = await PostService.updatePost(
      req.params.id,
      req.user.id,
      updateData
    );

    if (!updatedPost) {
      return res.status(403).json({
        success: false,
        message: "Post not found or you do not have permission to edit it."
      });
    }

    res.json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the post."
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const deletedPost = await PostService.deletePost(req.params.id, req.user.id);

    if (!deletedPost) {
      return res.status(404).json({ 
        success: false, 
        message: "Post not found or no permission" 
      });
    }
  await Comment.deleteMany({ postId: deletedPost._id });

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
      deletedPostId: deletedPost._id
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during deletion"
    });
  }
};

