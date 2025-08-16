const Comment = require('../models/comment');
const Post = require('../models/Post');
const { validationResult } = require('express-validator');

exports.createComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { content, postId, parentCommentId } = req.body;
    const userId = req.user.id;

    // Check if post exists
    const post = await Post.findById(postId);
    console.log("Post found:", post);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create the comment
    const comment = new Comment({
      content,
      postId,
      userId,
      parentComment: parentCommentId || null
    });
    console.log("Comment to be saved:", comment);
    await comment.save();

    // Add comment to post's comments array
    post.comments.push(comment._id);
    await post.save();

    // If this is a reply, add to parent comment's replies
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(
        parentCommentId,
        { $push: { replies: comment._id } }
      );
    }

    // Populate user details for response
    const populatedComment = await Comment.findById(comment._id)
      .populate({
        path: 'userId',
        select: 'username profilePic realname'
      })
      .lean();

    res.status(201).json({
      success: true,
      comment: populatedComment
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 20, skip = 0, sort = '-createdAt' } = req.query;

    // Validate post exists
    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comments = await Comment.find({ postId, parentComment: null })
      .sort(sort)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate({
        path: 'userId',
        select: 'username profilePic realname'
      })
      .populate({
        path: 'replies',
        options: { limit: 3, sort: '-createdAt' },
        populate: {
          path: 'userId',
          select: 'username profilePic realname'
        }
      })
      .lean();

    res.status(200).json({
      success: true,
      comments,
      count: comments.length
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

exports.likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const likeIndex = comment.likes.findIndex(id => id.toString() === userId.toString());

    if (likeIndex === -1) {
      comment.likes.push(userId);
    } else {
      comment.likes.splice(likeIndex, 1);
    }

    await comment.save();

    res.status(200).json({
      success: true,
      likes: comment.likes,
      likesCount: comment.likes.length
    });

  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

exports.updateComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, userId },
      { content, isEdited: true },
      { new: true }
    ).populate({
      path: 'userId',
      select: 'username profilePic realname'
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or no permission' });
    }

    res.status(200).json({
      success: true,
      comment
    });

  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findOneAndDelete({
      _id: commentId,
      userId
    });

    if (!comment) {
      return res.status(404).json({ 
        error: 'Comment not found or no permission to delete' 
      });
    }

    // Remove comment reference from post
    await Post.updateOne(
      { _id: comment.postId },
      { $pull: { comments: commentId } }
    );

    // If this was a parent comment, delete all replies
    if (comment.parentComment === null) {
      await Comment.deleteMany({ parentComment: commentId });
    } else {
      // If this was a reply, remove from parent's replies array
      await Comment.updateOne(
        { _id: comment.parentComment },
        { $pull: { replies: commentId } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};