const express = require("express");
const { getStreamToken } = require("../controllers/chatController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/token",authenticate, getStreamToken);

module.exports = router;
