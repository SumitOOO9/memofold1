const Notification = require("../models/notification");

class NotificationService {
    static async getNotification(userId, limit = 10, cursor = null) {
        const query = { recivier: userId };
        if (cursor) query._id = { $lt: cursor };
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('sender', 'username profilePic realname')
            .lean();
        return notifications;

    }
    static async markAsRead(notificationId, userId) {
      const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true },
      { new: true }
    );
    return notification;
  }
}

module.exports = NotificationService;