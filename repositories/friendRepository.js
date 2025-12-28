const User = require('../models/user');
const Notification = require('../models/notification');
const FriendList = require('../models/friendList');

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

  // FriendList helpers
  static async getFriendListByUserId(userId) {
    return await FriendList.findOne({ user: userId });
  }

  static async saveFriendList(doc) {
    return await doc.save();
  }

  static async upsertFriendList(userId, friendsArray) {
    return await FriendList.findOneAndUpdate(
      { user: userId },
      { $set: { friends: friendsArray } },
      { upsert: true, new: true }
    );
  }

  static async getfriendBYFriendId(userId, otherUserId) {
    const friend = await FriendList.findOne({ user: userId }, {
      friends: { $elemMatch: { _id: otherUserId } }
    });
    console.log("friend in repo",friend);
    return friend;
  }
}

module.exports = FriendRepository;
