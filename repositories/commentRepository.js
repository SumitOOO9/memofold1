const Comment = require('../models/comment');
const Post = require('../models/Post');

class CommentRepository {

  static async create(commentData, session = null) {
    return await Comment.create([commentData], { session });
  }

  static async find(query = {}, limit = 20, skip = 0, sort = '-createdAt') {
    return await Comment.find(query)
      .sort(sort)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate({ path: 'userId', select: 'username profilePic realname' })
      .lean();
  }

  static async findById(commentId) {
    return await Comment.findById(commentId)
      .populate({ path: 'userId', select: 'username profilePic realname' })
      .lean();
  }

  static async update(query, updateData) {
    return await Comment.findOneAndUpdate(query, updateData, { new: true })
      .populate({ path: 'userId', select: 'username profilePic realname' });
  }

  static async delete(commentId, session = null) {
    return await Comment.findByIdAndDelete(commentId, { session });
  }
  static async deleteManyByPostId(postId) {
  return Comment.deleteMany({ postId });
}

  static async findReplies(parentCommentId, limit = 10, cursor = null) {
    const query = { parentComment: parentCommentId };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    return await Comment.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate({ path: 'userId', select: 'username profilePic realname' })
      .lean();
  }

  static async toggleLike(commentId, userId) {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new Error('Comment not found');

    const update = comment.likes.includes(userId)
      ? { $pull: { likes: userId } }
      : { $addToSet: { likes: userId } };

    return await Comment.findByIdAndUpdate(commentId, update, { new: true });
  }

  static async addCommentToPost(postId, commentId, session = null) {
    return await Post.updateOne(
      { _id: postId },
      { $push: { comments: commentId } },
      { session }
    );
  }

  static async addReply(parentCommentId, replyId, session = null) {
    return await Comment.updateOne(
      { _id: parentCommentId },
      { $push: { replies: replyId } },
      { session }
    );
  }
}

module.exports = CommentRepository;
