const mongoose = require("mongoose");
const userRepository = require("../repositories/UserRepository");
const cache = require("../utils/cache");
const postRepository = require("../repositories/postRepository")

class UserService {
 static async isUsernameTaken(username, excludeUserId = null) {
    const cond = { username };
    if (excludeUserId) cond._id = { $ne: excludeUserId };
    const user = await userRepository.findOne(cond.toLowerCase());
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
  { username, email, description } = {}
) {
  const session = await mongoose.startSession();

  try {
    let updatedUser;
    let updatedProfile;

    await session.withTransaction(async () => {
      const userUpdates = {};
      const profileUpdates = {};

      if (username !== undefined) userUpdates.username = username;
      if (email !== undefined) userUpdates.email = email;
      if (description !== undefined)
        profileUpdates.description = description.trim();

      if (userUpdates.username) {
        const taken = await this.isUsernameTaken(userUpdates.username, userId);
        if (taken) throw new Error("Username already taken");
      }

      if (userUpdates.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userUpdates.email))
          throw new Error("Invalid email format");

        const emailTaken = await this.isEmailTaken(userUpdates.email, userId);
        if (emailTaken) throw new Error("Email already registered");
      }

      if (
        profileUpdates.description &&
        profileUpdates.description.length > 500
      ) {
        throw new Error("Description cannot exceed 500 characters");
      }

      // ⬇️ Sequential, session-safe updates
      updatedUser = await this.updateUserFields(
        userId,
        userUpdates,
        session
      );

      updatedProfile = await this.updateProfile(
        userId,
        profileUpdates,
        session
      );
    });

    // Outside transaction
    await cache.del(`user:${userId}`);

    const freshData = await this.getUserWithProfile(userId, {
      forceFresh: true,
    });

    await userRepository.updateUserIndex(userId, {
      username: updatedUser.username,
      fullName: updatedProfile.fullName,
      profilePic: updatedProfile.profilePic,
    });

    return { updatedUser, updatedProfile, freshData };
  } catch (err) {
    throw err;
  } finally {
    session.endSession(); // ✅ only here
  }
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
    const friendsCount = user.friends?.length || 0;
    console.log("user", user);
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
