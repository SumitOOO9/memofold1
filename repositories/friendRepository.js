const User = require('../models/user');
const Notification = require('../models/notification');

class FriendRepository {
  static async saveUser(user) {
    return await user.save();
  }

}

module.exports = FriendRepository;
