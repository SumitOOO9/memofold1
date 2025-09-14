const NotificationService = require("../service/notificationService");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await NotificationService.getNotification(req.user._id);
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notif = await NotificationService.markAsRead(req.params.id, req.user._id);
    res.json({ success: true, notification: notif });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};