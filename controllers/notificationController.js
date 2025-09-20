const NotificationService = require("../service/notificationService");

exports.getNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor || null;

    const notifications = await NotificationService.getNotification(req.user._id, limit, cursor);

    const nextCursor = notifications.length === limit
      ? notifications[notifications.length - 1]._id
      : null;

    res.json({ success: true, notifications, nextCursor });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const notif = await NotificationService.markAsRead(notificationId, req.user._id);

    if (!notif) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, notification: notif });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
