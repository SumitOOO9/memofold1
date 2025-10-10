const express = require("express");
const friendController = require("../controllers/friendController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/friend-request/:reciverUserId", authenticate, friendController.toggleFriendRequest);
router.post("/friend-request/:reciverUserId/respond", authenticate, friendController.respondToRequest);
router.get("/friends-list", authenticate, friendController.getFriendsList)
router.delete("/remove-friend/:friendId", authenticate, friendController.removeFriend)
module.exports = router;
