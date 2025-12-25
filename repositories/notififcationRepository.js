const Notification = require("../models/notification");

class NotificationRepository {

  static async findByUser(userId, limit = 10, cursor = null) {
    const query = { receiver: userId };
    if (cursor) query._id = { $lt: cursor };
    // console.log("Querying notifications with:", query, userId);
    // console.log("notification", await Notification.find(query))
    return await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username profilePic realname ')
      .populate('postid')
      .lean();
  }

  // static async markAsRead(notificationId, userId) {
  //   return await Notification.findOneAndUpdate(
  //     { _id: notificationId, receiver: userId },
  //     { read: true },
  //     { new: true }
  //   );
  // }
  static async markAsRead(notificationIds, userId) {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

    return await Notification.updateMany(
      { _id: { $in: ids }, receiver: userId },
      { $set: { read: true } }
    );
  }
  static async create(notificationData) {
    console.log("notificationData", notificationData);
    const notif = new Notification(notificationData);
    return await notif.save();
  }

  static async delete(filter) {
    return await Notification.deleteMany(filter);
  }

    static async countUnreadByUser(userId) {
    return await Notification.countDocuments({ receiver: userId, read: false });
  }
}

module.exports = NotificationRepository;
