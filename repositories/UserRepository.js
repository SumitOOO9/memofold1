const User = require("../models/user");
const Profile = require("../models/profile");

class UserRepository {
static async findById(userId) {
  return User.findById(userId).select("-password");
}
static async findByIds(userIds = []) {
  return User.find({ _id: { $in: userIds } }).select("-password").lean();
}


 static async findOne(cond) {
    return User.findOne(cond).lean();
  }

 static async updateUserFields(userId, userUpdates = {}, session = null) {
    if (!userUpdates || Object.keys(userUpdates).length === 0) {
      return User.findById(userId).select("-password");
    }
    const opts = { new: true, runValidators: true };
    if (session) opts.session = session;
    return User.findByIdAndUpdate(userId, { $set: userUpdates }, opts).select("-password");
  }

 static async updateProfile(userId, profileUpdates = {}, session = null) {
    if (!profileUpdates || Object.keys(profileUpdates).length === 0) {
      return Profile.findOne({ user: userId });
    }
    const opts = { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true };
    if (session) opts.session = session;
    return Profile.findOneAndUpdate({ user: userId }, { $set: profileUpdates }, opts);
  }

 static async findProfile(userId) {
    return Profile.findOne({ user: userId });
  }

  static async findUserWithProfile(userId){
    const user = await User.findById(userId).select("profilePic username");
    return{
      profilepic: user.profilePic,
      username: user.username
    }
  }

// repo
static async searchUsers(query, limit = 10) {
  const regex = new RegExp(`^${query}`, 'i'); // case-insensitive, starts with query
  const users = await User.find({
    $or: [
      { username: regex },
      { fullName: regex } // include fullName if you have this field
    ]
  })
  .limit(limit)
  .select('username fullName profilePic'); // return only needed fields

  return users.map(user => ({
    userId: user._id.toString(),
    username: user.username,
    fullName: user.fullName,
    profilePic: user.profilePic || ''
  }));
}


}

module.exports = UserRepository;
