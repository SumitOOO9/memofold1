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

router.post('/like/:id', authenticate, async(req, res) => { 
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");;
    if (post.likes.indexOf(req.user.userid) == -1) {
        post.likes.push(req.user.userid);
    }
    else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
     await post.save();
    res.redirect("/profile");
});

router.get('/edit/:id', authenticate, async(req, res) => { 
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");;
    
    res.render("edit" ,{post});
});

router.put('/update/:id', authenticate, async(req, res) => { 
    let post = await postModel.findOneAndUpdate({_id: req.params.id} , {content: req.body.content})
    
    res.redirect("/profile");
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
        const post = await postModel.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.userid
        });

        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: "Post not found or no permission" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Post deleted successfully",
            deletedPostId: post._id
        });

    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({
            success: false,
            message: "Server error during deletion"
        });
    }
});
// Handle actual delete
// router.delete('/delete/:id', authenticate, async (req, res) => {
//     try {
//         await postModel.findByIdAndDelete(req.params.id);
//         res.redirect('/profile');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send("Delete failed");
//     }
// });
// Simple test DELETE route - no auth, no params
// router.delete('/test-delete', (req, res) => {
//   console.log("✅ Test DELETE endpoint hit");
//   res.status(200).json({ 
//     message: "Test DELETE works!",
//     timestamp: new Date().toISOString()
//   });
// });

module.exports = router;
