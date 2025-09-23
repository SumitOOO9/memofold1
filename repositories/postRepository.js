const mongoose = require("mongoose");
const Post = require("../models/Post");
const Comment = require("../models/comment");
const User = require("../models/user");

class PostRepository {
  static async create(postData) {
    const post = new Post(postData);
    return await post.save();
  }

 static async getUserPosts(userId, limit = 10, cursor = null) {
    const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
    if (cursor) matchStage._id = { $lt: new mongoose.Types.ObjectId(cursor) };

    return await Post.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit },

      // Lookup post owner
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      // Likes preview (last 2 likes with user info)
      { $addFields: { likesPreview: { $slice: ["$likes", -2] } } },
      {
        $lookup: {
          from: "users",
          localField: "likesPreview.userId",
          foreignField: "_id",
          as: "likesPreviewUsers"
        }
      },

      // Final projection
      {
        $project: {
          _id: 1,
          content: 1,
          image: 1,
          createdAt: 1,
          updatedAt: 1,
          likeCount: { $size: "$likes" },
          commentCount: { $size: "$comments" },
          likesPreview: {
            $map: {
              input: "$likesPreviewUsers",
              as: "u",
              in: { username: "$$u.username", profilePic: "$$u.profilePic" }
            }
          },
          userId: {
            _id: "$user._id",
            username: "$user.username",
            realname: "$user.realname",
            profilePic: "$user.profilePic"
          }
        }
      }
    ]);
  }

  // 🔹 Get posts by username
  static async getPostsByUsername(username, limit = 10, cursor = null) {
    const matchStage = { username };
    if (cursor) matchStage._id = { $lt: new mongoose.Types.ObjectId(cursor) };

    return await Post.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      { $addFields: { likesPreview: { $slice: ["$likes", -2] } } },
      {
        $lookup: {
          from: "users",
          localField: "likesPreview.userId",
          foreignField: "_id",
          as: "likesPreviewUsers"
        }
      },

      {
        $project: {
          _id: 1,
          content: 1,
          image: 1,
          createdAt: 1,
          updatedAt: 1,
          likeCount: { $size: "$likes" },
          commentCount: { $size: "$comments" },
          likesPreview: {
            $map: {
              input: "$likesPreviewUsers",
              as: "u",
              in: { username: "$$u.username", profilePic: "$$u.profilePic" }
            }
          },
          userId: {
            _id: "$user._id",
            username: "$user.username",
            realname: "$user.realname",
            profilePic: "$user.profilePic"
          }
        }
      }
    ]);
  }

  // 🔹 Get single post by ID
  static async getPostById(postId) {
    const postObjId = new mongoose.Types.ObjectId(postId);

    const [post] = await Post.aggregate([
      { $match: { _id: postObjId } },
      { $limit: 1 },

      // Lookup post owner
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      // Count comments
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments"
        }
      },

      // Likes preview
      { $addFields: { likesPreview: { $slice: ["$likes", -2] } } },
      {
        $lookup: {
          from: "users",
          localField: "likesPreview.userId",
          foreignField: "_id",
          as: "likesPreviewUsers"
        }
      },

      // Final projection
      {
        $project: {
          _id: 1,
          content: 1,
          image: 1,
          createdAt: 1,
          updatedAt: 1,
          likeCount: { $size: "$likes" },
          commentCount: { $size: "$comments" },
          likesPreview: {
            $map: {
              input: "$likesPreviewUsers",
              as: "u",
              in: { username: "$$u.username", profilePic: "$$u.profilePic" }
            }
          },
          userId: {
            _id: "$user._id",
            username: "$user.username",
            realname: "$user.realname",
            profilePic: "$user.profilePic"
          }
        }
      }
    ]);

    return post || null;
  }

  static async update(query, updateData, options = {}) {
    return await Post.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true,
      ...options,
    });
  }

  static async delete(query) {
    return await Post.findOneAndDelete(query);
  }

  static async countComments(postId) {
    return await Comment.countDocuments({ postId });
  }

  static async countPostsByUserId(query) {
    return await Post.countDocuments(query);
  }

  static async find(query = {}, limit = 10, sort = { createdAt: -1 }) {
    if (typeof sort === "string") {
      const order = sort.startsWith("-") ? -1 : 1;
      const field = sort.replace("-", "");
      sort = { [field]: order };
    }

    return await Post.find(query)
      .sort(sort)
      .limit(limit)
      .select("userId username realname profilePic content image createdAt likes comments") // projection
      .lean();
  }

static async getFeed(limit, cursor = null) {
  const matchStage = cursor
    ? { _id: { $lt: new mongoose.Types.ObjectId(cursor) } }
    : {};

  return await Post.aggregate([
    { $match: matchStage },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: limit },

    // 🔹 Lookup post owner (userId → user)
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },

    {
      $project: {
        content: 1,
        image: 1,
        createdAt: 1,
        likeCount: { $size: "$likes" },
        commentCount: { $size: "$comments" },
        likesPreview: { $slice: ["$likes", -2] },

        // 🔹 embed user info directly
        userId: {
          _id: "$user._id",
          realname: "$user.realname",
          username: "$user.username",
          profilePic: "$user.profilePic"
        }
      }
    },

    // 🔹 Lookup users for like preview
    {
      $lookup: {
        from: "users",
        localField: "likesPreview.userId",
        foreignField: "_id",
        as: "likesPreviewUsers"
      }
    },
    {
      $project: {
        content: 1,
        image: 1,
        createdAt: 1,
        likeCount: 1,
        commentCount: 1,
        userId: 1,
        likesPreview: {
          $map: {
            input: "$likesPreviewUsers",
            as: "u",
            in: { username: "$$u.username", profilePic: "$$u.profilePic" }
          }
        }
      }
    }
  ]);
}

 static async getPostLikes(postId, limit = 20, cursor = null) {
    const matchStage = { _id: new mongoose.Types.ObjectId(postId) };
    
    const pipeline = [
      { $match: matchStage },
      { $project: { likes: 1 } },
      { $unwind: "$likes" },
      { $sort: { "likes.createdAt": -1 } }
    ];

    if (cursor) {
      pipeline.push({ $match: { "likes.userId": { $lt: new mongoose.Types.ObjectId(cursor) } } });
    }

    pipeline.push(
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "likes.userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$user._id",
          username: "$user.username",
          profilePic: "$user.profilePic",
          likedAt: "$likes.createdAt"
        }
      }
    );

    const likes = await Post.aggregate(pipeline);
    const nextCursor = likes.length > 0 ? likes[likes.length - 1]._id : null;

    return { data: likes, nextCursor };
  }

  static async toggleLike(postId, userId) {
    const postObjId = new mongoose.Types.ObjectId(postId);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const post = await Post.findOne({ _id: postObjId });
    if (!post) throw new Error("Post not found");

    const alreadyLiked = post.likes.some(l => l.userId.equals(userObjId));

    let update;
    if (alreadyLiked) {
      update = { $pull: { likes: { userId: userObjId } } };
    } else {
      update = { $push: { likes: { userId: userObjId, createdAt: new Date() } } };
    }

    const updatedPost = await Post.findByIdAndUpdate(postObjId, update, { new: true });
    return { updatedPost, action: alreadyLiked ? "unliked" : "liked" };
  }

}

module.exports = PostRepository;
