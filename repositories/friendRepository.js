const User = require('../models/user');
const Notification = require('../models/notification');
const FriendList = require('../models/friendList');
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

   static async getFriendListByUserId(userId) {
    return await FriendList.findOne({ user: userId });
  }

  static async addFriend(userId, friendId) {
    let doc = await FriendList.findOne({ user: userId });

    if (!doc) {
      doc = new FriendList({
        user: userId,
        friends: [{ _id: friendId, addedAt: new Date() }]
      });
    } else {
      const exists = doc.friends.some(
        f => f._id.toString() === friendId.toString()
      );
      if (!exists) {
        doc.friends.push({ _id: friendId, addedAt: new Date() });
      }
    }

    return await doc.save();
  }

  static async removeFriend(userId, friendId) {
    const doc = await FriendList.findOne({ user: userId });
    if (!doc) return;

    doc.friends = doc.friends.filter(
      f => f._id.toString() !== friendId.toString()
    );

    return await doc.save();
  }

  static async isFriend(userId, otherUserId) {
    const doc = await FriendList.findOne({ user: userId });
    if (!doc) return false;

    return doc.friends.some(
      f => f._id.toString() === otherUserId.toString()
    );
  }
}

module.exports = FriendRepository;
