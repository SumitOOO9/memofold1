const mongoose = require("mongoose");
const userRepository = require("../repositories/UserRepository");
const cache = require("../utils/cache");
const postRepository = require("../repositories/postRepository")

class UserService {
 static async isUsernameTaken(username, excludeUserId = null) {
    const cond = { username };
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

 static async updateUserAndProfileAtomic(userId, { username, email, description } = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userUpdates = {};
      const profileUpdates = {};

      if (username !== undefined) userUpdates.username = username;
      if (email !== undefined) userUpdates.email = email;
      if (description !== undefined) profileUpdates.description = description?.trim();

      if (userUpdates.username) {
        const taken = await this.isUsernameTaken(userUpdates.username, userId);
        if (taken) throw new Error("Username already taken");
      }

      if (userUpdates.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userUpdates.email)) throw new Error("Invalid email format");
        const emailTaken = await this.isEmailTaken(userUpdates.email, userId);
        if (emailTaken) throw new Error("Email already registered");
      }

      if (profileUpdates.description !== undefined && profileUpdates.description.length > 500) {
        throw new Error("Description cannot exceed 500 characters");
      }

      const [updatedUser, updatedProfile] = await Promise.all([
        this.updateUserFields(userId, userUpdates, session),
        this.updateProfile(userId, profileUpdates, session)
      ]);

      await session.commitTransaction();
      session.endSession();

      // Invalidate cache
      await cache.del(`user:${userId}`);

      return { updatedUser, updatedProfile };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

 static async getUserWithProfile(userId) {
    const cached = await cache.get(`user:${userId}`);
   if (cached) {
      return cached;
    }

    const user = await userRepository.findById(userId);
    const profile = await userRepository.findProfile(userId);
    const postCount = await postRepository.countPostsByUserId({ userId });
    const friendsCount = user.friends ? user.friends.length : 0;

    const result = { user, profile, stats:{
      postCount,
      friendsCount
    },
    // firendList: user.friends || []
  };

    await cache.set(`user:${userId}`, JSON.stringify(result), 300);

    return result;
  }
}


module.exports = UserService;
