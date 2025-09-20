const User = require('../models/user');
const Notification = require('../models/notification');

class FriendRepository {

  static async findUserById(userId, select = '') {
    return await User.findById(userId).select(select);
  }

  static async saveUser(user) {
    return await user.save();
  }

  static async addNotification(notificationData) {
    const notification = new Notification(notificationData);
    await notification.save();
    return notification;
  }

  static async deleteFriendNotifications(senderId, receiverId) {
    return await Notification.deleteMany({
      sender: senderId,
      receiver: receiverId,
      type: "friend_request"
    });
  }
}

module.exports = FriendRepository;
