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
    const processedContent = content ? content.trim() : "";

    const post = await PostRepository.create({
      content: processedContent,
      image: imageUrl,
      userId,
      username,
      createdAt: createdAt ? new Date(createdAt) : Date.now()
    });

    await redisClient.del('posts:all');
    await redisClient.del(`posts:user:${userId}`);
    
    return post;
  }

 static async getAllPosts(limit, cursor = null) {
  
  const query = cursor ? { _id: { $lt: cursor } } : {};

    const posts = await PostRepository.getFeed(limit, cursor);
  
  const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;


return { posts: posts, nextCursor }; 
}

static async getUserPosts(userId, limit = 10, cursor = null) {
    const cacheKey = `posts:user:${userId}:${limit}:${cursor || 'first'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const posts = await PostRepository.getUserPosts(userId, limit, cursor);
    const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;

    await redisClient.set(cacheKey, JSON.stringify(posts), 'EX', 60);
    return { posts, nextCursor };
  }

 static async getPostsByUsername(username, limit = 10, cursor = null) {
    const posts = await PostRepository.getPostsByUsername(username, limit, cursor);
    const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;
    return { posts, nextCursor };
  }

  static async getPostById(postId) {
    const post = await PostRepository.getPostById(postId);
    return post;
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
    return await PostRepository.getPostLikes(postId, limit, cursor);
  }

  static async likePost(postId, userId, io) {
    const { updatedPost, action } = await PostRepository.toggleLike(postId, userId);

    // Likes preview (latest 2)
    const lastLikes = updatedPost.likes.slice(-2).reverse();
    const userIds = lastLikes.map(l => l.userId);
    const users = await userRepository.findByIds(userIds);

    const likesPreview = lastLikes.map(like => {
      const user = users.find(u => u._id.equals(like.userId));
      return user ? { username: user.username, profilePic: user.profilePic } : null;
    }).filter(Boolean);

    // Notifications
    if (action === "liked" && updatedPost.userId.toString() !== userId.toString()) {
      const user = await UserRepository.findById(userId);
      await NotificationRepository.create({
        receiver: updatedPost.userId,
        sender: userId,
        type: "like",
        metadata: { username: user.username, realname: user.realname, profilePic: user.profilePic, postId }
      });

      io.to(updatedPost.userId.toString()).emit("newNotification", {
        message: `${user.username} liked your post`
      });
    } else if (action === "unliked") {
      await NotificationRepository.delete({
        receiver: updatedPost.userId,
        sender: userId,
        type: "like",
        "metadata.postId": postId
      });
    }

    // Emit real-time update
    io.to(`post:${postId}`).emit("postLiked", {
      postId,
      action,
      likesCount: updatedPost.likes.length,
      likesPreview
    });

    return updatedPost;
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


}
 
module.exports = PostService;
