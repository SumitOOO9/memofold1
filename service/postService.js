const Post = require('../models/Post');
const UploadService = require('./uploadService');

class PostService {
  static async createPost(userId, username, content, base64Image, createdAt) {
    let imageUrl = "";
    
    if (base64Image && base64Image.startsWith('data:image/')) {
      imageUrl = await UploadService.processBase64Image(base64Image, userId);
      if (!imageUrl) {
        throw new Error("Invalid image format");
      }
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

   static _populateComments() {
    return {
      path: 'comments',
      match: { parentComment: null },
      options: { sort: { createdAt: -1 } },
      populate: [
        { path: 'userId', select: 'username realname profilePic' },
        { 
          path: 'likes',
          populate: { path: 'userId', select: 'username realname profilePic' }
        },
        {
          path: 'replies',
          options: { sort: { createdAt: -1 }, limit: 3 },
          populate: [
            { path: 'userId', select: 'username realname profilePic' },
            { 
              path: 'likes',
              populate: { path: 'userId', select: 'username realname profilePic' }
            }
          ]
        }
      ]
    };
  }

static async getAllPosts() {
  return await Post.find({})
    .sort({ createdAt: -1 })
    .populate("userId", "username realname profilePic")
    .populate("likes.userId", "username realname profilePic")
    .populate(this._populateComments())

    .lean();
}

static async getUserPosts(userId) {
  return await Post.find({ userId })
    .sort({ createdAt: -1 })
    .populate("userId", "username realname profilePic")
    .populate("likes.userId", "username realname profilePic")
    .populate(this._populateComments())

    .lean();
}

static async getPostsByUsername(username) {
  return await Post.find({ username })
    .sort({ createdAt: -1 })
    .populate("userId", "username realname profilePic")
    .populate("likes.userId", "username realname profilePic")
    .populate(this._populateComments())
    .lean();
}





static async likePost(postId, userId) {
  const post = await Post.findById(postId);
  if (!post) throw new Error("Post not found");

  const likeIndex = post.likes.findIndex(
    like => like.userId.toString() === userId.toString()
  );

  if (likeIndex === -1) {
    post.likes.push({ userId });
  } else {
    post.likes.splice(likeIndex, 1);
  }

  return await post.save();
}


  static async getPostById(postId) {
    return await Post.findById(postId) .populate("userId", "username realname profilePic")
      .populate("likes.userId", "username realname profilePic")
      .populate(this._populateComments())
      .lean();
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