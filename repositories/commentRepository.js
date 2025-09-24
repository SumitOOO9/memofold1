const { default: mongoose } = require('mongoose');
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
   const match = { parentComment: new mongoose.Types.ObjectId(parentCommentId) };
   if(cursor){
    match.createdAt = { $lt: new Date(cursor) };
   }
   const replies = await Comment.aggregate([
    { $match: match},
    { $sort: {createdAt: -1, _id: -1}},
    { $limit: limit},
    { $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }},
    { $unwind: "$user"},
    { $project: {
      content: 1,
      createdAt: 1,
      likes: 1,
      user: { username: "$user.username", profilepic: "$user.profilepic"}
    }}
   ])
   console.log("replies",replies);
    return replies;
  }

static async toggleLike(commentId, userId) {
  const comment = await Comment.findById(commentId).select("likes postId userId");
  if (!comment) throw new Error('Comment not found');

  const liked = comment.likes.includes(userId.toString());
  const update = liked
    ? { $pull: { likes: userId } }
    : { $addToSet: { likes: userId } };

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    update,
    { new: true, select: "likes postId userId" }
  ).lean();

  return { updatedComment, action: liked ? "unliked" : "liked" };
}


static async addCommentToPost(postId, commentId, session = null) {
  return await Post.findByIdAndUpdate(
    postId,
    {
      $push: { comments: commentId },
      $inc: { commentCount: 1 }
    },
    { new: true, session, select: "commentCount userId" } // return updated doc
  ).lean();
}


  static async addReply(parentCommentId, replyId, session = null) {
    return await Comment.updateOne(
      { _id: parentCommentId },
      { $push: { replies: replyId } },
      { session }
    );
  }
static async updateCommentCount(postId, commentId, session = null) {
  return await Post.findByIdAndUpdate(
    postId,
    {
      $pull: { comments: commentId },
      $inc: { commentCount: -1 }
    },
    { session, new: true, select: "commentCount" }
  ).lean();
}



  static async countRepliesForComments(commentIds) {
    return Comment.aggregate([
      { $match: { parentComment: { $in: commentIds } } },
      { $group: { _id: "$parentComment", count: { $sum: 1 } } }
    ]);
  }


}

module.exports = CommentRepository;
