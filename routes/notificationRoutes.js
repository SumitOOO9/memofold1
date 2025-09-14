const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authenticate, notificationController.getNotifications);
router.put("/notification/:id/read", authenticate, notificationController.markAsRead);

module.exports = router;
