const mongoose = require('mongoose');
const CommentRepository = require('../repositories/commentRepository');
const redisClient = require('../utils/cache');
const PostRepository = require('../repositories/postRepository');
const UserRepository = require('../repositories/UserRepository');
const NotificationRepository = require('../repositories/notififcationRepository');
class CommentService {

static async createComment({ content, postId, userId, parentCommentId }, io) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [comment] = await CommentRepository.create(
      { content, postId, userId, parentComment: parentCommentId || null }, 
      session
    );

    await CommentRepository.addCommentToPost(postId, comment._id, session);

    if (parentCommentId) {
      await CommentRepository.addReply(parentCommentId, comment._id, session);
    }

    // Commit transaction
    await session.commitTransaction();

    // Invalidate cache
    await redisClient.del(`comments:post:${postId}`);
    if (parentCommentId) await redisClient.del(`replies:comment:${parentCommentId}`);

    const commentCount = await PostRepository.countComments(postId);
    io.to(`post:${postId}`).emit("newComment", {
      comment,
      parentCommentId,
      commentCount
    });

    // Notification
    const post = await PostRepository.findById(postId); 
    if (post.userId.toString() !== userId.toString()) {
      const user = await UserRepository.findById(userId); // use repository
      const notification = await NotificationRepository.create({
        receiver: post.userId,
        sender: userId,
        type: "comment",
        metadata: {
          username: user.username,
          realname: user.realname,
          profilePic: user.profilePic,
          postId: post._id,
          commentId: comment._id
        }
      });
      await notification.save();

      io.to(post.userId.toString()).emit("newNotification", {
        message: `${user.username} commented on your post`,
        notification
      });
    }

    return comment;
  } catch (err) {
    // Abort only if transaction is still active
    try { await session.abortTransaction(); } catch(e) {}
    throw err;
  } finally {
    session.endSession();
  }
}

  static async populateReplies(comment) {
    if (!comment.content) {
      comment = await CommentRepository.findById(comment._id || comment);
    }
    if (!comment.userId) return null;

    const replies = await CommentRepository.findReplies(comment._id);
    comment.replies = [];

    for (let reply of replies) {
      const populated = await CommentService.populateReplies(reply);
      if (populated) comment.replies.push(populated);
    }

    return comment;
  }

static async getComments({ postId, limit, cursor = null, sort = '-createdAt' }) {


  const query = { postId, parentComment: null };
  if (cursor) {
    // Cursor pagination using createdAt + _id to avoid duplicates
    const [field, order] = sort.startsWith('-') ? [sort.slice(1), -1] : [sort, 1];
    query[field] = order === -1 ? { $lt: new Date(cursor) } : { $gt: new Date(cursor) };
  }

  const comments = await CommentRepository.find(query, limit, 0, sort);

  for (let comment of comments) {
    const replies = await CommentRepository.findReplies(comment._id, 2); // only top 2 replies
    comment.replies = replies;
  }

  const nextCursor = comments.length ? comments[comments.length - 1].createdAt.toISOString() : null;
  return { comments, nextCursor };
}


  static async getReplies({ parentCommentId, limit = 10, cursor }) {
    const cacheKey = `replies:comment:${parentCommentId}:${limit}:${cursor || 'first'}`;
    const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return JSON.parse(cached);
    // }

    const replies = await CommentRepository.findReplies(parentCommentId, limit, cursor);
    const nextCursor = replies.length === limit ? replies[replies.length - 1].createdAt.toISOString() : null;

    await redisClient.set(cacheKey, JSON.stringify({ replies, nextCursor }), 'EX', 60);
    return { replies, nextCursor };
  }

static async toggleLike(commentId, userId, io) {
  const comment = await CommentRepository.toggleLike(commentId, userId);
  await redisClient.del(`comments:post:${comment.postId}`);

  let action = comment.likes.some(like => like.userId.toString() === userId.toString()) ? "liked" : "unliked";

  // Emit real-time update
  io.to(`comment:${commentId}`).emit("commentLiked", {
    commentId,
    postId: comment.postId,
    action,
    likesCount: comment.likes.length
  });

  // Notification if liked and not own comment
  if (action === "liked" && comment.userId.toString() !== userId.toString()) {
    const user = await UserRepository.findById(userId).select("username realname profilePic");
    const notification = await NotificationRepository.create({
      receiver: comment.userId,
      sender: userId,
      type: "comment_like",
      metadata: {
        username: user.username,
        realname: user.realname,
        profilePic: user.profilePic,
        postId: comment.postId,
        commentId: comment._id
      }
    });
    await notification.save();

    io.to(comment.userId.toString()).emit("newNotification", {
      message: `${user.username} liked your comment`,
      notification
    });
  } else if (action === "unliked") {
    await NotificationRepository.delete({
      receiver: comment.userId,
      sender: userId,
      type: "comment_like",
      "metadata.commentId": comment._id
    });
  }

  return comment;
}


  static async updateComment(commentId, userId, content) {
    const comment = await CommentRepository.update({ _id: commentId, userId }, { content, isEdited: true });
    if (!comment) throw new Error('Comment not found or no permission');
    await redisClient.del(`comments:post:${comment.postId}`);
    return comment;
  }

  static async deleteComment(commentId, userId) {
    const comment = await CommentRepository.findById(commentId);
    if (!comment) throw new Error('Comment not found');

    const postId = comment.postId;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const deleteRepliesRecursively = async (parentId) => {
        const replies = await CommentRepository.findReplies(parentId, 1000); // get all
        for (let r of replies) {
          await deleteRepliesRecursively(r._id);
          await CommentRepository.delete(r._id, session);
        }
      };

      await deleteRepliesRecursively(commentId);
      await CommentRepository.delete(commentId, session);

      // Remove comment from post
      await Post.updateOne({ _id: postId }, { $pull: { comments: commentId } }, { session });

      await session.commitTransaction();
      session.endSession();

      await redisClient.del(`comments:post:${postId}`);
      return true;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

module.exports = CommentService;
