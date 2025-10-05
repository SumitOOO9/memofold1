const User = require('../models/user');
const Notification = require('../models/notification');

class FriendRepository {
  static async saveUser(user) {
    return await user.save();
  }
 static async deleteFriendNotifications(senderUserId, receiverUserId) {
    try {
      await Notification.deleteMany({
        sender: senderUserId,
        receiver: receiverUserId,
        type: "friend_request"
      });
    } catch (error) {
      console.error("Error deleting friend notifications:", error.message);
    }
  }
}

module.exports = FriendRepository;
