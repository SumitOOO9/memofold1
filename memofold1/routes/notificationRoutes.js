const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authenticate, notificationController.getNotifications);
router.put("/notification/read/:id", authenticate, notificationController.markAsRead);
router.get("/unread-count", authenticate, notificationController.getUnreadCount);

module.exports = router;
