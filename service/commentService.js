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

    const post = await CommentRepository.addCommentToPost(postId, comment._id, session);

    if (parentCommentId) {
      await CommentRepository.addReply(parentCommentId, comment._id, session);
    }

    // Commit transaction
    await session.commitTransaction();

    // Invalidate cache
    await redisClient.del(`comments:post:${postId}`);
    if (parentCommentId) await redisClient.del(`replies:comment:${parentCommentId}`);

io.to(`post:${postId}`).emit("newComment", {
  comment,
  parentCommentId,
  commentCount: post.commentCount
});
    // Notification
    // const post = await PostRepository.findById(postId); 
    if (post.userId.toString() !== userId.toString())  {
      const user = await UserRepository.findById(userId); // use repository
      const notification = await NotificationRepository.create({
        receiver: post.userId,
        sender: userId,
        type: "comment",
        postid: new mongoose.Types.ObjectId(postId),
        metadata: {
          username: user.username,
          realname: user.realname,
          profilePic: user.profilePic,
          commentId: comment._id
        }
      });
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
    const [field, order] = sort.startsWith('-') ? [sort.slice(1), -1] : [sort, 1];
    query[field] = order === -1 ? { $lt: new Date(cursor) } : { $gt: new Date(cursor) };
  }

  const comments = await CommentRepository.find(query, limit, 0, sort);
  const commentIds = comments.map(c => c._id)

  const replyCounts = await CommentRepository.countRepliesForComments(commentIds);

  const countMap = {};
  replyCounts.forEach(rc => (countMap[rc._id.toString()] = rc.count))

  const commentsWithCount = comments.map(c => ({
    ...c,
    replyCount: countMap[c._id.toString()] || 0
  }))

    const totalCount =
    comments.length + replyCounts.reduce((sum, rc) => sum + rc.count, 0);
  const nextCursor = comments.length ? comments[comments.length - 1].createdAt.toISOString() : null;
  return { comments: commentsWithCount, nextCursor, totalCount };
}


  static async getReplies({ parentCommentId, limit = 10, cursor }) {
    const replies = await CommentRepository.findReplies(parentCommentId, limit, cursor);
    const nextCursor = replies.length === limit ? replies[replies.length - 1].createdAt.toISOString() : null;

 
    return { replies, nextCursor };
  }



static async toggleLike(commentId, userId, io) {
  const { updatedComment, action } = await CommentRepository.toggleLike(commentId, userId);

  // Emit real-time update immediately
  io.to(`comment:${commentId}`).emit("commentLiked", {
    commentId,
    postId: updatedComment.postId,
    action,
    likesCount: updatedComment.likes.length
  });

  // Async: delete cache and manage notifications
  (async () => {
    await redisClient.del(`comments:post:${updatedComment.postId}`);

    if (action === "liked" && updatedComment.userId.toString() !== userId.toString()) {
      const user = await UserRepository.findById(userId)
      const notification = await NotificationRepository.create({
        receiver: updatedComment.userId,
        sender: userId,
        type: "comment_like",
        metadata: {
          username: user.username,
          realname: user.realname,
          profilepic: user.profilePic,
          postId: updatedComment.postId,
          commentId: updatedComment._id
        }
      });
      await notification.save();
      io.to(updatedComment.userId.toString()).emit("newNotification", {
        message: `${user.username} liked your comment`,
        notification
      });
    } else if (action === "unliked") {
      await NotificationRepository.delete({
        receiver: updatedComment.userId,
        sender: userId,
        type: "comment_like",
        "metadata.commentId": updatedComment._id
      });
    }
  })();

  return updatedComment;
}



  static async updateComment(commentId, userId, content) {
    const comment = await CommentRepository.update({ _id: commentId, userId }, { content, isEdited: true });
    if (!comment) throw new Error('Comment not found or no permission');
    await redisClient.del(`comments:post:${comment.postId}`);
    return comment;
  }

 static async deleteComment(commentId, userId, useSession = true) {
  const comment = await CommentRepository.findById(commentId);
  console.log("comment to delete",comment);
  if (!comment) throw new Error('Comment not found');
  // console.log("comment",comment.userId._id.toString(),userId.toString());

  // post owner can delete comment
  const post = await PostRepository.findById(comment.postId);
  // console.log("post for comment",post);
  if (post.userId.toString() !== userId.toString() &&
    comment.userId._id.toString() !== userId.toString()) {
    throw new Error('you are not authorized to delete this comment');
  }
  const postId = comment.postId;
  let session;

  if (useSession) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
        let totalDeleted = 1;
const allCommentIds = [commentId];
    const deleteRepliesRecursively = async (parentId) => {
      const replies = await CommentRepository.findReplies(parentId, 1000); // get all
      for (let r of replies) {
                allCommentIds.push(r._id);

                totalDeleted++;
        await deleteRepliesRecursively(r._id);
        await CommentRepository.delete(r._id, session);
      }
        console.log("Deleting comment and its replies...",replies);

    };
    await deleteRepliesRecursively(commentId);
    await CommentRepository.delete(commentId, session);
const updatedPost = await CommentRepository.updateCommentCount(postId, allCommentIds, session, -totalDeleted);
    console.log("Updated post after comment deletion:", updatedPost.commentCount);


      if (session) {
      await session.commitTransaction();
      session.endSession();
    }

      await redisClient.del(`comments:post:${postId}`);
      // io.to(`post:${postId}`).emit("commentDeleted", {
      //   commentId,
      //   postId,
      //   commentCount: updatedPost.commentCount
      // });
    
    return { success: true, commentCount: updatedPost.commentCount };
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
}

}

module.exports = CommentService;
