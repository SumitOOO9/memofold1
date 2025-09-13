const CommentService = require('../service/commentService');
const { validationResult } = require('express-validator');

// Create a comment or reply
exports.createComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const comment = await CommentService.createComment({
      content: req.body.content,
      postId: req.params.postId,
      userId: req.user.id,
      parentCommentId: req.body.parentCommentId
    });

    // Populate the newly created comment with replies & user info
    const populatedComment = await CommentService.populateReplies(comment);

    res.status(201).json({ success: true, comment: populatedComment });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all comments for a post (with nested replies)
exports.getComments = async (req, res) => {
  try {
    const comments = await CommentService.getComments({
      postId: req.params.postId,
      limit: req.query.limit,
      skip: req.query.skip,
      sort: req.query.sort
    });

    res.status(200).json({ success: true, comments, count: comments.length });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Like/unlike a comment
exports.likeComment = async (req, res) => {
  try {
    const comment = await CommentService.toggleLike(req.params.commentId, req.user.id);

    res.status(200).json({
      success: true,
      likes: comment.likes,
      likesCount: comment.likes.length
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update a comment
exports.updateComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const comment = await CommentService.updateComment(
      req.params.commentId,
      req.user.id,
      req.body.content
    );

    res.status(200).json({ success: true, comment });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete a comment (and all nested replies)
exports.deleteComment = async (req, res) => {
  try {
    await CommentService.deleteComment(req.params.commentId, req.user.id);

    res.status(200).json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
