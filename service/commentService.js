const mongoose = require('mongoose');
const Comment = require('../models/comment');
const Post = require('../models/Post');

class CommentService {

  static async createComment({ content, postId, userId, parentCommentId }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const comment = await Comment.create([{
        content,
        postId,
        userId,
        parentComment: parentCommentId || null
      }], { session });

      await Post.updateOne(
        { _id: postId },
        { $push: { comments: comment[0]._id } },
        { session }
      );

      if (parentCommentId) {
        await Comment.updateOne(
          { _id: parentCommentId },
          { $push: { replies: comment[0]._id } },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();
      return comment[0];
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }


static async populateReplies(comment) {
  // If comment is just an ID, fetch full comment
  if (!comment.content) {
    comment = await Comment.findById(comment._id || comment)
      .populate({ path: 'userId', select: 'username profilePic realname' })
      .lean();
  }

  // If comment's user is deleted, skip this comment
  if (!comment.userId) return null;

  // Fetch all replies dynamically
  const replies = await Comment.find({ parentComment: comment._id })
    .sort('-createdAt')
    .populate({ path: 'userId', select: 'username profilePic realname' })
    .lean();

  comment.replies = [];
  for (let reply of replies) {
    const populatedReply = await CommentService.populateReplies(reply);
    if (populatedReply) comment.replies.push(populatedReply); // only push if user exists
  }

  return comment;
}

static async getComments({ postId, limit = 20, skip = 0, sort = '-createdAt' }) {
  const comments = await Comment.find({ postId, parentComment: null })
    .sort(sort)
    .skip(parseInt(skip))
    .limit(parseInt(limit))
    .populate({ path: 'userId', select: 'username profilePic realname' })
    .lean();

  const populatedComments = [];
  for (let comment of comments) {
    const populated = await CommentService.populateReplies(comment);
    if (populated) populatedComments.push(populated); // only include if user exists
  }

  return populatedComments;
}





  // Toggle like
  static async toggleLike(commentId, userId) {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new Error('Comment not found');

    const hasLiked = comment.likes.includes(userId);
    const update = hasLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } };
    return await Comment.findByIdAndUpdate(commentId, update, { new: true });
  }

  // Update comment
  static async updateComment(commentId, userId, content) {
    const updatedComment = await Comment.findOneAndUpdate(
      { _id: commentId, userId },
      { content, isEdited: true },
      { new: true }
    ).populate({ path: 'userId', select: 'username profilePic realname' });

    if (!updatedComment) throw new Error('Comment not found or no permission');
    return updatedComment;
  }

  // Delete comment with replies recursively
static async deleteComment(commentId, userId) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new Error('Comment not found');

  const post = await Post.findById(comment.postId);
  if (!post) throw new Error('Post not found');

  // Only comment owner or post owner can delete
  if (comment.userId.toString() !== userId && post.userId.toString() !== userId) {
    throw new Error('No permission to delete this comment');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Recursively delete all replies dynamically
    const deleteReplies = async (parentCommentId) => {
      const replies = await Comment.find({ parentComment: parentCommentId }).session(session);
      for (let reply of replies) {
        await deleteReplies(reply._id); // delete nested replies first
        await Comment.findByIdAndDelete(reply._id, { session });
      }
    };

    await deleteReplies(comment._id); // start with the main comment
    await Comment.findByIdAndDelete(comment._id, { session });

    // Remove comment from post
    await Post.updateOne(
      { _id: comment.postId },
      { $pull: { comments: comment._id } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    return true;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

}

module.exports = CommentService;
