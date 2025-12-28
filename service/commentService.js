const mongoose = require('mongoose');
const CommentRepository = require('../repositories/commentRepository');
const redisClient = require('../utils/cache');
const PostRepository = require('../repositories/postRepository');
const UserRepository = require('../repositories/UserRepository');
const PostService = require('./postService');
const NotificationService = require('./notificationService');
const { Types } = require('mongoose');
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
   // consolelog("Updated post after new comment:", post);

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
   if (post.userId.toString() !== userId.toString()) {
  const payload =
    await CommentService.buildCommentNotificationPayload({
      receiverId: post.userId,
      senderId: userId,
      type: parentCommentId ? "reply" : "comment",
      post,
      commentCount: post.commentCount
    });

    console.log("payload",payload);

  await NotificationService.createNotification(payload);

  io.to(post.userId.toString()).emit("newNotification", payload);
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

//helper function
static async buildCommentNotificationPayload({
  receiverId,
  senderId,
  type,
  post,
  commentCount
}) {
  const sender = await UserRepository.findById(senderId);

  return {
    receiver: receiverId,
    sender: {
      _id: sender._id,
      username: sender.username,
      realname: sender.realname,
      profilePic: sender.profilePic
    },
    type, // "comment" | "reply" | "like"
    metadata: {
      username: sender.username,
      realname: sender.realname,
      profilePic: sender.profilePic
    },
    postid: {
      _id: post._id,
      userId: post.userId,
      username: post.username,
      content: post.content,
      image: post.image || "",
      videoUrl: post.videoUrl || "",
      commentCount,
      likeCount: post.likes?.length || 0
    },
    read: false
  };
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

    console.log("Like action:", action);

    if (action === "liked" && updatedComment.userId.toString() !== userId.toString()) {
  const post = await PostRepository.findById(updatedComment.postId);

  const payload =
    await CommentService.buildCommentNotificationPayload({
      receiverId: updatedComment.userId,
      senderId: userId,
      type: "comment_like",
      post,
      commentCount: post.commentCount
    });

  await NotificationService.createNotification(payload);

  io.to(updatedComment.userId.toString()).emit("newNotification", payload);
}
 else if (action === "unliked") {
await NotificationService.deleteNotifications({
  receiver: updatedComment.userId.toString(), // string
  sender: userId.toString(),                  // string
  type: updatedComment.parentComment ? "reply_like" : "comment_like"
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
 // consolelog("comment to delete",comment);
  if (!comment) throw new Error('Comment not found');
  //// consolelog("comment",comment.userId._id.toString(),userId.toString());

  // post owner can delete comment
  const post = await PostRepository.findById(comment.postId);
  //// consolelog("post for comment",post);
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
const allCommentUserIds = [comment.userId._id.toString()];

    const deleteRepliesRecursively = async (parentId) => {
      const replies = await CommentRepository.findReplies(parentId, 1000); // get all
      for (let r of replies) {
                allCommentIds.push(r._id);
    allCommentUserIds.push(r.userId._id.toString());  

                totalDeleted++;
        await deleteRepliesRecursively(r._id);
        await CommentRepository.delete(r._id, session);
      }
       // consolelog("Deleting comment and its replies...",replies);

    };
    await deleteRepliesRecursively(commentId);
    await CommentRepository.delete(commentId, session);
const updatedPost = await CommentRepository.updateCommentCount(postId, allCommentIds, session, -totalDeleted);
   // consolelog("Updated post after comment deletion:", updatedPost.commentCount);


      if (session) {
      await session.commitTransaction();
      session.endSession();
    }

      // Delete notifications related to the deleted comment(s)
      try {
       await NotificationService.deleteNotifications({
   type: { $in: ["comment", "reply"] },
    postid: postId,
    sender: { $in: allCommentUserIds }// the users who authored the deleted comments
});
        console.log('Deleted notifications for comments', allCommentIds);
      } catch (e) {
        console.error('Failed to delete notifications for comments', allCommentIds, e);
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
