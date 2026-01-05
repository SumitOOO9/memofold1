const mongoose = require("mongoose");
const userRepository = require("../repositories/UserRepository");
const cache = require("../utils/cache");
const postRepository = require("../repositories/postRepository")

class UserService {
static async isUsernameTaken(username, excludeUserId = null) {
  const normalizedUsername = username.toLowerCase();

  const cond = { username: normalizedUsername };
  if (excludeUserId) cond._id = { $ne: excludeUserId };

  const user = await userRepository.findOne(cond);
  return !!user;
}


 static async isEmailTaken(email, excludeUserId = null) {
    const cond = { email };
    if (excludeUserId) cond._id = { $ne: excludeUserId };
    const user = await userRepository.findOne(cond);
    return !!user;
  }

 static async updateUserFields(userId, userUpdates = {}, session = null) {
    return userRepository.updateUserFields(userId, userUpdates, session);
  }

 static async updateProfile(userId, profileUpdates = {}, session = null) {
    return userRepository.updateProfile(userId, profileUpdates, session);
  }

static async updateUserAndProfileAtomic(
  userId,
  { username, email, description }
) {
   const userUpdates = {};
  const profileUpdates = {};

  if (username) userUpdates.username = username.toLowerCase();
  if (email) userUpdates.email = email;
  if (description !== undefined) {
    if (description === null) {
      throw new Error("Description cannot be null");
    }

    if (typeof description !== "string") {
      throw new Error("Description must be a string");
    }

    if (description.length > 500) {
      throw new Error("Description cannot exceed 500 characters");
    }

    profileUpdates.description = description.trim();
  }

  const [user, profile] = await Promise.all([
    Object.keys(userUpdates).length
      ? userRepository.updateUserFields(userId, userUpdates)
      : userRepository.findById(userId),

    Object.keys(profileUpdates).length
      ? userRepository.updateProfile(userId, profileUpdates)
      : userRepository.findProfile(userId),
  ]);

  cache.del(`user:${userId}`);
  userRepository.updateUserIndex(userId, {
    username: user.username,
    profilePic: profile?.profilePic,
  });

  return { user, profile };
}


 static async getUserWithProfile(userId, { forceFresh = false } = {}) {
    if (!forceFresh) {
    // const cached = await cache.get(`user:${userId}`);
    // console.log("cached",cached);
    // if (cached) cached
  }

    const [user, profile, postCount] = await Promise.all([
      userRepository.findById(userId),
      userRepository.findProfile(userId),
      postRepository.countPostsByUserId({ userId })
    ])
      // Use FriendList collection for friends count
      const FriendRepository = require('../repositories/friendRepository');
      const friendListDoc = await FriendRepository.getFriendListByUserId(userId);
      const friendsCount = friendListDoc?.friends?.length || 0;
    // console.log("user", user);
    const result = { user, profile, stats:{
      postCount,
      friendsCount
    },
    // firendList: user.friends || []
  };

    await cache.set(`user:${userId}`, JSON.stringify(result), 13000);

    return result;
  }

   static async searchUsers(query, limit = 10) {
  const cacheKey = `user_search:${query.toLowerCase()}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const results = await userRepository.searchUsers(query, limit);

   cache.set(cacheKey, JSON.stringify(results), 30); 
  return results;
}


}


module.exports = UserService;
