const PostRepository = require('../repositories/postRepository');
const UploadService = require('./uploadService');
const redisClient = require('../utils/cache'); 

class PostService {

  static async createPost(userId, username, content, base64Image, createdAt) {
    let imageUrl = "";

    if (base64Image && base64Image.startsWith('data:image/')) {
      imageUrl = await UploadService.processBase64Image(base64Image, userId);
      if (!imageUrl) throw new Error("Invalid image format");
    }

    const post = await PostRepository.create({
      content: content.trim(),
      image: imageUrl,
      userId,
      username,
      createdAt: createdAt ? new Date(createdAt) : Date.now()
    });

    // Invalidate cached posts
    await redisClient.del('posts:all');
    await redisClient.del(`posts:user:${userId}`);
    
    return post;
  }

  static async getAllPosts(limit = 10, cursor = null) {
    const cacheKey = `posts:all:${limit}:${cursor || 'first'}`;
    // const cached = await redisClient.get(cacheKey);

    // // if (cached) {
    //   return JSON.parse(cached);
    // }

    const query = cursor ? { _id: { $lt: cursor } } : {};
    const posts = await PostRepository.find(query, limit);
    // console.log("Fetched posts from DB:", posts.length);

    const populatedPosts = await PostService._populateLikesAndComments(posts);

    await redisClient.set(cacheKey, JSON.stringify(populatedPosts), 'EX', 60);
    return populatedPosts;
  }

  static async getUserPosts(userId, limit = 10, cursor = null) {
    const cacheKey = `posts:user:${userId}:${limit}:${cursor || 'first'}`;
    const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return JSON.parse(cached);
    // }

    const query = { userId };
    if (cursor) query._id = { $lt: cursor };

    const posts = await PostRepository.find(query, limit);
    const populatedPosts = await PostService._populateLikesAndComments(posts);

    await redisClient.set(cacheKey, JSON.stringify(populatedPosts), 'EX', 60);
    return populatedPosts;
  }

  static async getPostById(postId) {
    const cacheKey = `post:${postId}`;
    const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return JSON.parse(cached);
    // }

    const post = await PostRepository.findById(postId);
    if (post) post.comments = await Comment.find({ postId }).lean();

    await redisClient.set(cacheKey, JSON.stringify(post), 'EX', 60);
    return post;
  }

  static async getPostsByUsername(username, limit = 10, cursor = null) {
    const cacheKey = `posts:username:${username}:${limit}:${cursor || 'first'}`;
    const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return JSON.parse(cached);
    // }
    const query = { username };
    if (cursor) query._id = { $lt: cursor };
    const posts = await PostRepository.find(query, limit);
    const populatedPosts = await PostService._populateLikesAndComments(posts);
    await redisClient.set(cacheKey, JSON.stringify(populatedPosts), 'EX', 60);
    return populatedPosts;
  }

  static async updatePost(postId, userId, updateData) {
    const post = await PostRepository.update({ _id: postId, userId }, updateData);
    
    // Invalidate caches
    await redisClient.del('posts:all');
    await redisClient.del(`posts:user:${userId}`);
    await redisClient.del(`post:${postId}`);

    return post;
  }
static async getPostLikes(postId, limit = 20, cursor = null) {
  const post = await PostRepository.findById(postId);
  if (!post) throw new Error("Post not found");

  if (!post.likes || post.likes.length === 0) {
    return { data: [], nextCursor: null };
  }

  let sortedLikes = [...post.likes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const userIds = sortedLikes.map(l => l.userId);
  const existingUsers = await PostRepository.findUsersByIds({userIds }).select('username profilePic');
  sortedLikes = sortedLikes.filter(l => existingUsers.some(u => u._id.toString() === l.userId.toString()));

  if (cursor) {
    const cursorIndex = sortedLikes.findIndex(l => l.userId.toString() === cursor);
    if (cursorIndex >= 0) sortedLikes = sortedLikes.slice(cursorIndex + 1);
  }

  const sliced = sortedLikes.slice(0, limit);

  const data = sliced.map(like => {
    const user = existingUsers.find(u => u._id.toString() === like.userId.toString());
    return { username: user.username, profilePic: user.profilePic };
  });

  const nextCursor = sliced.length > 0 ? sliced[sliced.length - 1].userId : null;

  return { data, nextCursor };
}



 static async likePost(postId, userId, io) {
    const post = await PostRepository.findById(postId);
    if (!post) throw new Error("Post not found");

    const likeIndex = post.likes.findIndex(like => like.userId.toString() === userId.toString());
    let action = "";

    if (likeIndex === -1) {
      post.likes.push({ userId, createdAt: new Date() });
      action = "liked";

      // Send notification to post owner (if not liking own post)
      if (post.userId.toString() !== userId.toString()) {
        const user = await PostRepository.findUsersByIds(userId).select("username realname profilePic");
        const notification = new Notification({
          receiver: post.userId,
          sender: userId,
          type: "post_like",
          metadata: {
            username: user.username,
            realname: user.realname,
            profilePic: user.profilePic,
            postId: post._id
          }
        });
        await notification.save();

        io.to(post.userId.toString()).emit("newNotification", {
          message: `${user.username} liked your post`,
          notification
        });
      }

    } else {
      post.likes.splice(likeIndex, 1);
      action = "unliked";

      // Remove notification if unliked
      await Notification.deleteMany({
        receiver: post.userId,
        sender: userId,
        type: "post_like",
        "metadata.postId": post._id
      });
    }

    await post.save();

    // Emit real-time update for post viewers
    io.to(`post:${postId}`).emit("postLiked", {
      postId,
      action,
      likesCount: post.likes.length,
      likesPreview: populatedPost[0].likesPreview

    });

    return post;
  }
  static async deletePost(postId, userId) {
    const post = await PostRepository.delete({ _id: postId, userId });

    if (!post) return null;

    // Delete comments
    await Comment.deleteMany({ postId });

    // Invalidate caches
    await redisClient.del('posts:all');
    await redisClient.del(`posts:user:${userId}`);
    await redisClient.del(`post:${postId}`);

    return post;
  }

static async _populateLikesAndComments(posts) {
  for (let post of posts) {
    if (post.likes && post.likes.length > 0) {
      const userIds = post.likes.map(l => l.userId);
      const existingUsers = await PostRepository.findUsersByIds(userIds);

      // Keep only likes from existing users
      post.likes = post.likes.filter(like => existingUsers.some(u => u._id.toString() === like.userId.toString()));
      post.likesCount = post.likes.length;

      const latestLikes = post.likes
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 2)
        .map(like => {
          const user = existingUsers.find(u => u._id.toString() === like.userId.toString());
          return { username: user.username, profilePic: user.profilePic };
        });

      post.likesPreview = latestLikes;
    } else {
      post.likes = [];
      post.likesCount = 0;
      post.likesPreview = [];
    }

    post.commentCount = await PostRepository.countComments(post._id);
  }

  return posts;
}


}

module.exports = PostService;
