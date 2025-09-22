const PostRepository = require('../repositories/postRepository');
const UploadService = require('./uploadService');
const redisClient = require('../utils/cache'); 
const userRepository = require('../repositories/UserRepository');
const commentRepository = require("../repositories/commentRepository")
const NotificationRepository = require("../repositories/notififcationRepository")
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

 static async getAllPosts(limit, cursor = null) {
  
  const query = cursor ? { _id: { $lt: cursor } } : {};

  const posts = await PostRepository.find(query, limit, '-_id'); 

  const populatedPosts = await PostService._populateLikesAndComments(posts);

  
  const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;

return { posts: populatedPosts, nextCursor }; 
}

  static async getUserPosts(userId, limit = 10, cursor = null) {
    const cacheKey = `posts:user:${userId}:${limit}:${cursor || 'first'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return cached;
    }

    const query = { userId };
    if (cursor) query._id = { $lt: cursor };

    const posts = await PostRepository.find(query, limit);
    const populatedPosts = await PostService._populateLikesAndComments(posts);

    await redisClient.set(cacheKey, JSON.stringify(populatedPosts), 'EX', 60);
      const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;

    return {populatedPosts,nextCursor};
  }

  static async getPostById(postId) {
    const cacheKey = `post:${postId}`;
    const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return JSON.parse(cached);
    // }

    const post = await PostRepository.findById(postId);
    if (post) post.comments = await commentRepository.find({ postId });

    await redisClient.set(cacheKey, JSON.stringify(post), 'EX', 60);
    return post;
  }

  static async getPostsByUsername(username, limit = 10, cursor = null) {
    const cacheKey = `posts:username:${username}:${limit}:${cursor || 'first'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return cached;
    }
    const query = { username };
    if (cursor) query._id = { $lt: cursor };
    const posts = await PostRepository.find(query, limit);
    const populatedPosts = await PostService._populateLikesAndComments(posts);
    await redisClient.set(cacheKey, JSON.stringify(populatedPosts), 'EX', 60);
    const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;
    return {populatedPosts,nextCursor};
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

const userIds = sortedLikes.map(like => like.userId._id ? like.userId._id : like.userId);
// console.log("User IDs from likes:", userIds);

const existingUsers = await userRepository.findByIds(userIds);
// console.log("Existing users found:", existingUsers);
sortedLikes = sortedLikes.filter(l => {
  const likeUserId = l.userId._id ? l.userId._id.toString() : l.userId.toString();
  return existingUsers.some(u => u._id.toString() === likeUserId);
});
  // console.log("Filtered likes after checking existing users:", sortedLikes.length);
  if (cursor) {
    const cursorIndex = sortedLikes.findIndex(l => l.userId.toString() === cursor);
    if (cursorIndex >= 0) sortedLikes = sortedLikes.slice(cursorIndex + 1);
  }

  const sliced = sortedLikes.slice(0, limit);

  const data = sliced.map(like => {
      const likeUserId = like.userId._id ? like.userId._id.toString() : like.userId.toString();
  const user = existingUsers.find(u => u._id.toString() === likeUserId);
    // console.log("Mapping like for user:", user ? user: "User not found");
    return { username: user.username, profilePic: user.profilePic };
  });

  const nextCursor = sliced.length > 0 ? sliced[sliced.length - 1].userId : null;

  return { data, nextCursor };
}



static async likePost(postId, userId, io) {
  const post = await PostRepository.findById(postId);
  if (!post) throw new Error("Post not found");

  // Normalize likes: ensure every like has .userId as ObjectId
  post.likes = post.likes.map(like => ({
    userId: like.userId._id ? like.userId._id : like.userId,
    createdAt: like.createdAt || new Date()
  }));

  // Toggle like
  const likeIndex = post.likes.findIndex(like => like.userId.toString() === userId.toString());
  let action = "";

  if (likeIndex === -1) {
    post.likes.push({ userId, createdAt: new Date() });
    action = "liked";
  } else {
    post.likes.splice(likeIndex, 1);
    action = "unliked";
  }

  await post.save();

  // Likes preview (latest 2 likes)
  const lastLikes = post.likes.slice(-2).reverse();
  const userIds = lastLikes.map(l => l.userId);
  const users = await userRepository.findByIds(userIds);

  const likesPreview = lastLikes.map(like => {
    const user = users.find(u => u._id.toString() === like.userId.toString());
    return user ? { username: user.username, profilePic: user.profilePic } : null;
  }).filter(Boolean);

  // Notifications
  if (action === "liked" && post.userId.toString() !== userId.toString()) {
    const user = await userRepository.findById(userId);
    await NotificationRepository.create({
      receiver: post.userId,
      sender: userId,
      type: "like",
      metadata: {
        username: user.username,
        realname: user.realname,
        profilePic: user.profilePic,
        postId: post._id
      }
    });

    io.to(post.userId.toString()).emit("newNotification", {
      message: `${user.username} liked your post`
    });
  } else if (action === "unliked") {
    await NotificationRepository.delete({
      receiver: post.userId,
      sender: userId,
      type: "like",
      "metadata.postId": post._id
    });
  }

  // Emit update
  io.to(`post:${postId}`).emit("postLiked", {
    postId,
    action,
    likesCount: post.likes.length,
    likesPreview
  });

  return post;
}


  static async deletePost(postId, userId) {
    const post = await PostRepository.delete({ _id: postId, userId });

    if (!post) return null;

    // Delete comments
    await commentRepository.deleteManyByPostId(postId);

    // Invalidate caches
    await redisClient.del('posts:all');
    await redisClient.del(`posts:user:${userId}`);
    await redisClient.del(`post:${postId}`);

    return post;
  }

static async _populateLikesAndComments(posts) {
  for (let post of posts) {
    if (post.likes && post.likes.length > 0) {
      post.likes = post.likes.map(l => ({
        userId: l.userId._id ? l.userId._id : l.userId,
        createdAt: l.createdAt || new Date()
      }));

      const userIds = post.likes.map(l => l.userId);
      const existingUsers = await userRepository.findByIds(userIds);

      // Keep only likes from existing users
      post.likes = post.likes.filter(like =>
        existingUsers.some(u => u._id.toString() === like.userId.toString())
      );

      post.likesCount = post.likes.length;

      const latestLikes = post.likes
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(-2)
        .map(like => {
          const user = existingUsers.find(u => u._id.toString() === like.userId.toString());
          return user ? { username: user.username, profilePic: user.profilePic } : null;
        })
        .filter(Boolean);

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
