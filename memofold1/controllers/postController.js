const { image } = require('../config/cloudinary');
const PostService = require('../service/postService');
const UploadService = require('../service/uploadService');

exports.createPost = async (req, res) => {
  try {
    // console.log("Request body:", req.body);
    const { content, createdAt, image: base64Image } = req.body;
    const videoUrl = req.videoUrl || null;
    console.log("Base64 Image:", base64Image);
    console.log("Uploaded media URL:", videoUrl);

        const mediaPublicId = req.media?.publicId || null;

    const isContentEmpty = !content || content.trim() === "";
 const isMediaEmpty =
      (!base64Image || base64Image === "null" || base64Image.trim() === "") &&
      !videoUrl;

    if (isContentEmpty && isMediaEmpty) {
      return res.status(400).json({ error: "Post cannot be created without content or image" });
    }

    const post = await PostService.createPost(
      req.user.id, 
      req.user.username, 
      content || "", 
      base64Image, 
      createdAt,
      videoUrl,
      mediaPublicId 
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
    const userId = req.user.id;
    const { limit = 10, cursor } = req.query;
    const {posts, nextCursor} = await PostService.getAllPosts(userId, Number(limit), cursor);
    res.status(200).json({ success: true, posts, nextCursor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, cursor } = req.query;
    const {posts, nextCursor} = await PostService.getUserPosts(userId, Number(limit), cursor);
    res.status(200).json({ success: true, posts, nextCursor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPostByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, cursor } = req.query;
    const {posts, nextCursor} = await PostService.getPostsByUserId(req.params.id, Number(limit), cursor, userId);
    res.status(200).json({ success: true, posts, nextCursor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.likePost = async (req, res) => {
  try {
    const post = await PostService.likePost(req.params.id, req.user.id, req.io);

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
exports.getPostById = async (req,res) => {
  try{
    const id = req.params.id;
    const userId = req.user.id;
    const post = await PostService.getPostById(id, userId);
    if(!post){
      return res.status(404).json({success:false, message: "Post not found"})
    }
    res.status(200).json({success:true, post})
} catch(error){
  res.status(500).json({success:false, message: error.message})
}
}
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
    const body = req.body || {};
    const content = body.content;
    const image = body.image;   
    const media = body.media;   
    console.log("Update request body:", body);
    let updateData = {};

    if (typeof content === "string") {
      updateData.content = content;
    }


    if (image !== undefined) {
      if (image === null || image === "" || image === "remove") {
        updateData.image = "";
        updateData.media = null;
      }

      // 🖼️ New base64 image
      else if (typeof image === "string" && image.startsWith("data:image/")) {
        const uploaded = await UploadService.processBase64Image(
          image,
          req.user.id
        );

        if (!uploaded) {
          return res.status(400).json({
            success: false,
            message: "Invalid image format",
          });
        }

        updateData.image = uploaded.url;
        updateData.media = {
          url: uploaded.url,
          publicId: uploaded.publicId,
          type: "image",
        };
      }

      // 🔁 Existing URL (keep or replace)
      else if (typeof image === "string") {
        updateData.image = image;
      }
    }

    /* ================= VIDEO HANDLING ================= */
if (req.media && req.media.type === "video") {
  updateData.media = req.media;
  updateData.videoUrl = req.media.url; // keep legacy in sync
  updateData.image = ""; // clear image
}

// 🗑️ Explicit video removal (from body)
if (body.media === null || body.media === "" || body.media === "remove") {
  updateData.media = null;
  updateData.videoUrl = "";
}

    // 🚫 Nothing to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nothing to update",
      });
    }

    const updatedPost = await PostService.updatePost(
      req.params.id,
      req.user.id,
      updateData
    );

    res.json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the post.",
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
  // await Comment.deleteMany({ postId: deletedPost._id });

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

