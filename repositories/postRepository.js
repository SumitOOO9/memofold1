const Post = require('../models/Post');
const Comment = require('../models/comment');
const User = require('../models/user');

class PostRepository {

  static async create(postData) {
    const post = new Post(postData);
    return await post.save();
  }

  static async find(query = {}, limit = 10, sort = { createdAt: -1 }) {
    console.log("PostRepository find called with query:", query, "limit:", limit, "sort:", sort);
    return await Post.find(query)
      .sort(sort)
      .limit(limit)
      .populate('userId', 'username realname profilePic')
      .lean();
  }

  static async findById(postId) {
    return await Post.findById(postId)
      .populate('userId', 'username realname profilePic')
      .populate('likes.userId', 'username realname profilePic')
      .lean();
  }

  static async update(query, updateData) {
    return await Post.findOneAndUpdate(query, updateData, { new: true, runValidators: true });
  }

  static async delete(query) {
    return await Post.findOneAndDelete(query);
  }

  static async countComments(postId) {
    return await Comment.countDocuments({ postId });
  }

  static async findUsersByIds(userIds) {
    return await User.find({ _id: { $in: userIds } }).select('username profilePic');
  }
  static async countPostsByUserId(query) {
    return await Post.countDocuments(query);
  }
}

module.exports = PostRepository;
