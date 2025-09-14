const express = require("express");
const friendController = require("../controllers/friendController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/friend-request/:reciverUserId", authenticate, friendController.toggleFriendRequest);
router.post("/friend-request/:reciverUserId/respond", authenticate, friendController.respondToRequest);

module.exports = router;
