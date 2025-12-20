const PostRepository = require("../repositories/postRepository");
const UploadService = require("./uploadService");
const redisClient = require("../utils/cache");
const userRepository = require("../repositories/UserRepository");
const commentRepository = require("../repositories/commentRepository");
const NotificationRepository = require("../repositories/notififcationRepository");
const mongoose = require("mongoose");
const deleteFromCloudinary = require("../utils/deleteCloudinary");
class PostService {
  static async createPost(
    userId,
    username,
    content,
    base64Image,
    createdAt,
    videoUrl,
    mediaPublicId
  ) {
    let imageUrl = "";
    let mediaUrl = "";
    let media = null;
    let uploadedImage = null;
    console.log("Creating post with base64Image:and videoUrl:", videoUrl);

    if (base64Image && base64Image.startsWith("data:image/")) {
      uploadedImage = await UploadService.processBase64Image(base64Image, userId);
      if (!uploadedImage) throw new Error("Invalid image format");
    }

if (uploadedImage) {
  imageUrl = uploadedImage.url;

  media = {
    url: uploadedImage.url,
    publicId: uploadedImage.publicId,
    type: "image"
  };
}
  

  // 🎥 Video from Cloudinary middleware
  if (videoUrl && mediaPublicId) {
    media = {
      url: videoUrl,
      publicId: mediaPublicId,
      type: "video"
    };
  }

    const processedContent = content ? content.trim() : "";

    const post = await PostRepository.create({
      content: processedContent,
      image: imageUrl,
      userId,
      username,
      media, 
      videoUrl: videoUrl || "", 
      createdAt: createdAt ? new Date(createdAt) : Date.now(),
    });

    await redisClient.del("posts:all");
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
    const cacheKey = `posts:user:${userId}:${limit}:${cursor || "first"}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const posts = await PostRepository.getUserPosts(userId, limit, cursor);
    const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;

    await redisClient.set(cacheKey, JSON.stringify(posts), "EX", 60);
    return { posts, nextCursor };
  }

  static async getPostsByUserId(userId, limit = 10, cursor = null) {
    const posts = await PostRepository.getPostsByUserId(
      userId,
      limit,
      cursor
    );
    const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;
    return { posts, nextCursor };
  }

  static async getPostById(postId) {
    const post = await PostRepository.getPostById(postId);
    return post;
  }

  static async updatePost(postId, userId, updateData) {
    const existingPost = await PostRepository.findPostMediaByIdAndUser(postId, userId);

    if (!existingPost) {
      throw new Error("Post not found or unauthorized");
    }

    const post = await PostRepository.update(
      { _id: postId, userId },
      updateData
    );

    console.log("Updated post:", post);
    

    if (
      updateData.media &&
      existingPost.media?.publicId &&
      existingPost.media.publicId !== updateData.media.publicId
    ) {
      deleteFromCloudinary(
        existingPost.media.publicId,
        existingPost.media.type
      );
    }

    // Invalidate caches
    await redisClient.del("posts:all");
    await redisClient.del(`posts:user:${userId}`);
    await redisClient.del(`post:${postId}`);

    return post;
  }
  static async getPostLikes(postId, limit = 20, cursor = null) {
    return await PostRepository.getPostLikes(postId, limit, cursor);
  }

  static async likePost(postId, userId, io) {
    const { updatedPost, action } = await PostRepository.toggleLike(
      postId,
      userId
    );

    const lastLikes = updatedPost.likes.slice(-2).reverse();
    const userIds = lastLikes.map((l) => l.userId);
    const users = await userRepository.findByIds(userIds);

    const likesPreview = lastLikes
      .map((like) => {
        const user = users.find((u) => u._id.equals(like.userId));
        return user
          ? { username: user.username, profilePic: user.profilePic }
          : null;
      })
      .filter(Boolean);

    // Notifications
    if (
      action === "liked" &&
      updatedPost.userId.toString() !== userId.toString()
    ) {
      const user = await userRepository.findById(userId);
      await NotificationRepository.create({
        receiver: updatedPost.userId,
        sender: userId,
        type: "like",
        postid: new mongoose.Types.ObjectId(postId),
        metadata: {
          username: user.username,
          realname: user.realname,
          profilePic: user.profilePic,
        },
      });

      io.to(updatedPost.userId.toString()).emit("newNotification", {
        message: `${user.username} liked your post`,
      });
    } else if (action === "unliked") {
      await NotificationRepository.delete({
        receiver: updatedPost.userId,
        sender: userId,
        type: "like",
        postid: new mongoose.Types.ObjectId(postId),
      });
    }

    io.to(`post:${postId}`).emit("postLiked", {
      postId,
      action,
      likesCount: updatedPost.likes.length,
      likesPreview,
    });

    return updatedPost;
  }

  static async deletePost(postId, userId) {
    const existingPost = await PostRepository.findPostMediaByIdAndUser(
      postId,
      userId
    );

    if (!existingPost) {
      return null;
    }

    const post = await PostRepository.delete({ _id: postId, userId });

    if (!post) return null;

    if (post.media?.publicId) {
      deleteFromCloudinary(post.media.publicId, post.media.type);
      console.log("Deleted media from Cloudinary:", post.media.publicId);
    }

    // Delete comments
    await commentRepository.deleteManyByPostId(postId);

    // Invalidate caches
    await redisClient.del("posts:all");
    await redisClient.del(`posts:user:${userId}`);
    await redisClient.del(`post:${postId}`);

    return post;
  }
}

module.exports = PostService;
