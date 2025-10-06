const NotificationService = require("../service/notificationService");

exports.getNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor || null;
    console.log("Controller - Fetching notifications for user:", req.user.id)
    const notifications = await NotificationService.getNotification(req.user.id, limit, cursor);

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
    const { id } = req.params; 
    const { notificationIds } = req.body; 

    const ids = notificationIds || id;

    if (!ids)
      return res.status(400).json({ success: false, message: "No notification IDs provided" });

    const result = await NotificationService.markAsRead(ids, req.user.id);
    res.json({ success: true, message: "Marked as read", result });
  } catch (err) {
    console.error("Error marking notification(s) as read:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user.id);
    res.json({ success: true, count });
  } catch (err) {
    console.error("Error fetching unread count:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};