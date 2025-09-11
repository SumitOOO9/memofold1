const express = require('express');
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const postController = require("../controllers/postController");
const commentController = require("../controllers/commentController");
const { validateComment } = require("../middleware/commentValidation");
const { 
  uploadSingle, 
  uploadSingleToCloudinary, 
  handleMulterError 
} = require("../middleware/uploadMiddleware");

// Post routes
router.post("/", 
  authenticate, 
  uploadSingle, 
  handleMulterError,
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

// Comment routes
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

router.use(handleMulterError);

module.exports = router;