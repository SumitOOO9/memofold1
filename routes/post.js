const express = require('express');
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const postController = require("../controllers/postController");
const commentController = require("../controllers/commentController");
const { validateComment, validateCommentUpdate } = require("../validation/commentValidation");
const { 
  uploadSingle, 
  uploadSingleToCloudinary, 
  handleMulterError 
} = require("../middleware/uploadMiddleware");

// Post routes
router.post("/", 
  authenticate, 
  uploadSingle, 
  uploadSingleToCloudinary, 
  postController.createPost
);



router.get("/", authenticate, postController.getPosts);
router.get("/my-posts", authenticate, postController.getMyPosts);
router.get("/user/:username", authenticate, postController.getPostsByUsername);
router.post('/like/:id', authenticate, postController.likePost);
router.get('/edit/:id', authenticate, postController.getPostForEdit);
router.put('/update/:id', authenticate, postController.updatePost);
router.delete('/delete/:id', authenticate, postController.deletePost);
router.get('/:id/likes', authenticate, postController.getPostLikes);
router.get('/:id', authenticate, postController.getPostById)
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

router.get('/replies/:commentId',authenticate,commentController.getReplies)
router.put('/comments/:commentId', 
  authenticate, 
  validateCommentUpdate, 
  commentController.updateComment
);

router.delete('/comments/:commentId', 
  authenticate, 
  commentController.deleteComment
);

// router.use(handleMulterError);

module.exports = router;
