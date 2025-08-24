const express = require('express');
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const postController = require("../controllers/postController");
const mongoose = require('mongoose');
const Post = require('../models/Post');// Create a new post
const commentController = require("../controllers/commentController");
const { validateComment } = require("../middleware/commentValidation");
const { 
  uploadSingle, 
  uploadSingleToCloudinary, 
  cleanupTempFiles,
  handleMulterError 
} = require("../middleware/cloudinaryUpload");
const fs = require('fs');
const path = require('path');
const cloudinary = require("../config/cloudinary");


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


router.post("/", authenticate, uploadSingle, // Use single image upload
  uploadSingleToCloudinary, 
  cleanupTempFiles, postController.createPost);

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

router.post('/like/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: "Post not found" });

    // Initialize and clean the likes array
    if (!post.likes) post.likes = [];
    post.likes = post.likes.filter(id => id != null); // Remove any existing nulls

    // Convert both IDs to string for reliable comparison
    const likeIndex = post.likes.findIndex(id => 
      id && id.toString() === userId.toString()
    );

    if (likeIndex === -1) {
      post.likes.push(userId); // Only push valid user IDs
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json({ success: true, likes: post.likes.filter(Boolean) }); // Final filter
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get('/edit/:id', authenticate, async(req, res) => { 
  console.log("Edit route accessed for post ID:", req.params.id);
    try {
    let post = await Post.findOne({ _id: req.params.id }).populate("userId");
    // Send the post data as JSON instead of trying to render a template
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
});


router.put('/update/:id', authenticate, async (req, res) => {
  try {
    console.log("Update route accessed for post ID:", req.body);
    const { content, image: base64Image } = req.body; 
    
    let updateData = { content };

    // Process base64 image if provided
    if (base64Image) {
      if (base64Image === 'remove') {
        // Handle image removal case
        updateData.image = "";
      } else if (base64Image.startsWith('data:image/')) {
        const imageUrl = processBase64Image(base64Image, req.user.id);
        if (!imageUrl) {
          return res.status(400).json({
            success: false,
            message: "Invalid image format"
          });
        }
        updateData.image = imageUrl;
      } else {
        // If it's already a URL or empty string, keep it as is
        updateData.image = base64Image;
      }
    }


    const updatedPost = await Post.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id 
      },
      updateData,
      { new: true } 
    );

    if (!updatedPost) {
      return res.status(403).json({
        success: false,
        message: "Post not found or you do not have permission to edit it."
      });
    }

    // 5. Successfully updated
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
});

// Show delete confirmation page
// router.delete('/delete/:id', authenticate, async (req, res) => {
//     try {
//         const post = await postModel.findById(req.params.id);
//         if (!post) return res.status(500).send("Post not found");
//         res.render('delete', { post });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send("Server Error");
//     }
// });
router.delete('/delete/:id', authenticate, async (req, res) => {
    try {
        const posts = await Post.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!posts) {
            return res.status(404).json({ 
                success: false, 
                message: "Post not found or no permission" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Post deleted successfully",
            deletedPostId: posts._id
        });

    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({
            success: false,
            message: "Server error during deletion"
        });
    }
});
router.post('/:postId/comments', 
  authenticate, 
  validateComment, 
  commentController.createComment
);

router.get('/:postId/comments', 
  authenticate, 
  commentController.getComments
);

router.post('/comments/:commentId/like', 
  authenticate, 
  commentController.likeComment
);

router.put('/comments/:commentId', 
  authenticate, 
  validateComment, 
  commentController.updateComment
);

router.delete('/comments/:commentId', 
  authenticate, 
  commentController.deleteComment
);

module.exports = router;
