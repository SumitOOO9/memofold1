const Post = require('../models/Post');
const Comment = require('../models/comment');
const User = require('../models/user');
const UploadService = require('./uploadService');

class PostService {

  static async createPost(userId, username, content, base64Image, createdAt) {
    let imageUrl = "";

    if (base64Image && base64Image.startsWith('data:image/')) {
      imageUrl = await UploadService.processBase64Image(base64Image, userId);
      if (!imageUrl) throw new Error("Invalid image format");
    }

    const post = new Post({
      content: content.trim(),
      image: imageUrl,
      userId,
      username,
      createdAt: createdAt ? new Date(createdAt) : Date.now(),
    });

    return await post.save();
  }

  // static async populateComments(postId) {
  //   const comments = await Comment.find({ postId })
  //     .sort({ createdAt: 1 })
  //     .populate('userId', 'username realname profilePic')
  //     .lean();

  //   const map = new Map();
  //   comments.forEach(c => map.set(c._id.toString(), { ...c, replies: [] }));

  //   const roots = [];
  //   comments.forEach(c => {
  //     if (c.parentComment) {
  //       const parent = map.get(c.parentComment.toString());
  //       if (parent) parent.replies.push(map.get(c._id.toString()));
  //     } else {
  //       roots.push(map.get(c._id.toString()));
  //     }
  //   });

  //   return roots;
  // }
  static async getAllPosts(limit = 10, cursor = null) {
    const query = cursor ? { _id: { $lt: cursor } } : {};

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'username realname profilePic')
      .lean();

    return await PostService._populateLikesAndComments(posts);
  }
static async getUserPosts(userId, limit = 10, cursor = null) {
    const query = { userId };
    if (cursor) query._id = { $lt: cursor };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'username realname profilePic')
      .lean();

    return await PostService._populateLikesAndComments(posts);
  }

  static async getPostsByUsername(username, limit = 10, cursor = null) {
    const query = { username };
    if (cursor) query._id = { $lt: cursor };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'username realname profilePic')
      .lean();

    return await PostService._populateLikesAndComments(posts);
  }


static async getPostLikes(postId, limit = 20, cursor = null) {
  const post = await Post.findById(postId).lean();
  if (!post) throw new Error("Post not found");

  if (!post.likes || post.likes.length === 0) {
    return { data: [], nextCursor: null };
  }

  // Sort likes by newest first
  let sortedLikes = [...post.likes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Filter out deleted users
  const userIds = sortedLikes.map(l => l.userId);
  const existingUsers = await User.find({ _id: { $in: userIds } }).select('username profilePic');
  sortedLikes = sortedLikes.filter(l => existingUsers.some(u => u._id.toString() === l.userId.toString()));

  // Apply cursor pagination
  if (cursor) {
    const cursorIndex = sortedLikes.findIndex(l => l.userId.toString() === cursor);
    if (cursorIndex >= 0) sortedLikes = sortedLikes.slice(cursorIndex + 1);
  }

  // Slice for limit
  const sliced = sortedLikes.slice(0, limit);

  // Map to user info
  const data = sliced.map(like => {
    const user = existingUsers.find(u => u._id.toString() === like.userId.toString());
    return { username: user.username, profilePic: user.profilePic };
  });

  const nextCursor = sliced.length > 0 ? sliced[sliced.length - 1].userId : null;

  return { data, nextCursor };
}



  static async likePost(postId, userId) {
    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");

    const likeIndex = post.likes.findIndex(like => like.userId.toString() === userId.toString());
    if (likeIndex === -1) post.likes.push({ userId });
    else post.likes.splice(likeIndex, 1);

    return await post.save();
  }

  static async getPostById(postId) {
    const post = await Post.findById(postId)
      .populate('userId', 'username realname profilePic')
        .populate('likes.userId', 'username realname profilePic')

      .lean();

    if (post) post.comments = await PostService.populateComments(post._id);

    return post;
  }


  static async updatePost(postId, userId, updateData) {
    return await Post.findOneAndUpdate(
      { _id: postId, userId },
      updateData,
      { new: true, runValidators: true }
    );
  }

  static async deletePost(postId, userId) {
    return await Post.findOneAndDelete({ _id: postId, userId });
  }
static async _populateLikesAndComments(posts) {
  for (let post of posts) {
    // Total likes
    post.likesCount = post.likes?.length || 0;

    if (post.likes && post.likes.length > 0) {
      // Sort likes by newest first
      let sortedLikes = [...post.likes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Get unique user IDs
      const userIds = sortedLikes.map(l => l.userId);
      const existingUsers = await User.find({ _id: { $in: userIds } }).select('username profilePic');

      // Filter out likes from deleted users
      sortedLikes = sortedLikes.filter(like => existingUsers.some(u => u._id.toString() === like.userId.toString()));

      // Take latest 2 likes
      const latestLikes = sortedLikes.slice(0, 2);

      // Map to username & profilePic
      post.likesPreview = latestLikes.map(like => {
        const user = existingUsers.find(u => u._id.toString() === like.userId.toString());
        return { username: user.username, profilePic: user.profilePic };
      });
    } else {
      post.likesPreview = [];
    }

    // Comment count
    post.commentCount = await Comment.countDocuments({ postId: post._id });

    // Remove original likes array
    delete post.likes;
  }

  return posts;
}






}



module.exports = PostService;
