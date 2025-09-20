const User = require("../models/user");
const Profile = require("../models/profile");

class UserRepository {
  async findById(userId) {
    return User.findById(userId).select("-password");
  }

  async findOne(cond) {
    return User.findOne(cond).lean();
  }

  async updateUserFields(userId, userUpdates = {}, session = null) {
    if (!userUpdates || Object.keys(userUpdates).length === 0) {
      return User.findById(userId).select("-password");
    }
    const opts = { new: true, runValidators: true };
    if (session) opts.session = session;
    return User.findByIdAndUpdate(userId, { $set: userUpdates }, opts).select("-password");
  }

  async updateProfile(userId, profileUpdates = {}, session = null) {
    if (!profileUpdates || Object.keys(profileUpdates).length === 0) {
      return Profile.findOne({ user: userId });
    }
    const opts = { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true };
    if (session) opts.session = session;
    return Profile.findOneAndUpdate({ user: userId }, { $set: profileUpdates }, opts);
  }

  async findProfile(userId) {
    return Profile.findOne({ user: userId });
  }
}

module.exports = UserRepository;
