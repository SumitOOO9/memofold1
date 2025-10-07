const express = require("express");
const { getStreamToken } = require("../controllers/chatController");
const router = express.Router();

router.get("/token", getStreamToken);

module.exports = router;
