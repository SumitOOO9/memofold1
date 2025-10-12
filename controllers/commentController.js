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
      parentCommentId: req.body.parentCommentId,
    },
  req.app.get("io")
);

    const populatedComment = await CommentService.populateReplies(comment);

    res.status(201).json({ success: true, comment: populatedComment });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const {comments, totalCount, nextCursor} = await CommentService.getComments({
      postId: req.params.postId,
      limit: req.query.limit || 10,
      cursor: req.query.cursor,
      sort: req.query.sort
    });
    res.status(200).json({ success: true, comments, count: totalCount, nextCursor });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getReplies = async (req,res) => {
  try{
    const parentCommentId = req.params.commentId;
    const limit = req.query.limit || 10;
    const cursor = req.query.cursor || null;
    const {replies, nextCursor} = await CommentService.getReplies({
      parentCommentId,
      limit,
      cursor
    })

    res.status(200).json({
      success: true,
      replies,
      nextCursor
    })
  } catch(error)
  {
    console.error('Error fetching replies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Like/unlike a comment
exports.likeComment = async (req, res) => {
  try {
    const comment = await CommentService.toggleLike(req.params.commentId, req.user.id, req.app.get("io"));

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
