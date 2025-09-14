const Post = require('../models/Post');
const Comment = require('../models/comment');
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

    for (let post of posts) {
      const populatedPost = await Post.findById(post._id)
        .populate({
          path: 'likes.userId',
          select: 'username profilePic',
          options: { sort: { createdAt: -1 }, limit: 2 }
        })
        .lean();

      post.likesPreview = populatedPost.likes.map(l => l.userId);
      post.likesCount = post.likes?.length || 0;

      post.commentCount = await Comment.countDocuments({ postId: post._id });
    }

    return posts;
  }

  static async getUserPosts(userId, limit = 10, cursor = null) {
    const query = { userId };
    if (cursor) query._id = { $lt: cursor };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'username realname profilePic')
      .lean();

    for (let post of posts) {
      const populatedPost = await Post.findById(post._id)
        .populate({
          path: 'likes.userId',
          select: 'username profilePic',
          options: { sort: { createdAt: -1 }, limit: 2 }
        })
        .lean();

      post.likesPreview = populatedPost.likes.map(l => l.userId);
      post.likesCount = post.likes?.length || 0;
      post.commentCount = await Comment.countDocuments({ postId: post._id });
    }

    return posts;
  }

  static async getPostsByUsername(username, limit = 10, cursor = null) {
    const query = { username };
    if (cursor) query._id = { $lt: cursor };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'username realname profilePic')
      .lean();

    for (let post of posts) {
      const populatedPost = await Post.findById(post._id)
        .populate({
          path: 'likes.userId',
          select: 'username profilePic',
          options: { sort: { createdAt: -1 }, limit: 2 }
        })
        .lean();

      post.likesPreview = populatedPost.likes.map(l => l.userId);
      post.likesCount = post.likes?.length || 0;
      post.commentCount = await Comment.countDocuments({ postId: post._id });
    }

    return posts;
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
   static async getPostLikes(postId, limit = 20, cursor = null) {
    const post = await Post.findById(postId).populate({
      path: 'likes.userId',
      select: 'username profilePic',
      options: { sort: { createdAt: -1 } }
    }).lean();

    if (!post) throw new Error("Post not found");

    let likes = post.likes.map(l => l.userId);
    if (cursor) {
      const cursorIndex = likes.findIndex(u => u._id.toString() === cursor);
      if (cursorIndex >= 0) likes = likes.slice(cursorIndex + 1);
    }

    return likes.slice(0, limit);
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
}

module.exports = PostService;
