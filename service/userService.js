// services/userService.js
const mongoose = require('mongoose');
const User = require('../models/user');
const Profile = require('../models/profile');

class UserService {
  static async isUsernameTaken(username, excludeUserId = null) {
    const cond = { username };
    if (excludeUserId) cond._id = { $ne: excludeUserId };
    const user = await User.findOne(cond).lean();
    return !!user;
  }

  static async isEmailTaken(email, excludeUserId = null) {
    const cond = { email };
    if (excludeUserId) cond._id = { $ne: excludeUserId };
    const user = await User.findOne(cond).lean();
    return !!user;
  }

  static async updateUserFields(userId, userUpdates = {}, session = null) {
    if (!userUpdates || Object.keys(userUpdates).length === 0) {
      return User.findById(userId).select('-password');
    }
    const opts = { new: true, runValidators: true };
    if (session) opts.session = session;
    return User.findByIdAndUpdate(userId, { $set: userUpdates }, opts).select('-password');
  }

  static async updateProfile(userId, profileUpdates = {}, session = null) {
    if (!profileUpdates || Object.keys(profileUpdates).length === 0) {
      return Profile.findOne({ user: userId });
    }
    const opts = { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true };
    if (session) opts.session = session;
    return Profile.findOneAndUpdate({ user: userId }, { $set: profileUpdates }, opts);
  }

  /**
   * Update user and profile atomically (transaction).
   * Accepts an object with optional keys: username, email, description
   */
  static async updateUserAndProfileAtomic(userId, { username, email, description } = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userUpdates = {};
      const profileUpdates = {};

      // Prepare updates
      if (username !== undefined) userUpdates.username = username;
      if (email !== undefined) userUpdates.email = email;
      if (description !== undefined) profileUpdates.description = description?.trim();

      // Validations
      if (userUpdates.username) {
        const taken = await this.isUsernameTaken(userUpdates.username, userId);
        if (taken) throw new Error('Username already taken');
      }

      if (userUpdates.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userUpdates.email)) throw new Error('Invalid email format');
        const emailTaken = await this.isEmailTaken(userUpdates.email, userId);
        if (emailTaken) throw new Error('Email already registered');
      }

      if (profileUpdates.description !== undefined && profileUpdates.description.length > 500) {
        throw new Error('Description cannot exceed 500 characters');
      }

      // Perform updates in parallel within the transaction
      const [updatedUser, updatedProfile] = await Promise.all([
        this.updateUserFields(userId, userUpdates, session),
        this.updateProfile(userId, profileUpdates, session)
      ]);

      await session.commitTransaction();
      session.endSession();

      return { updatedUser, updatedProfile };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  static async getUserWithProfile(userId) {
    const user = await User.findById(userId).select('-password');
    const profile = await Profile.findOne({ user: userId });
    return { user, profile };
  }
}

module.exports = UserService;
