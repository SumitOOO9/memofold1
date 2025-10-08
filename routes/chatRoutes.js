const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { getStreamToken } = require("../controllers/chatController");
const { ensureUsersExist } = require("../controllers/ensureUsersController");

const router = express.Router();

router.get("/token", authenticate, getStreamToken);
router.post("/ensureUsersExist", authenticate, ensureUsersExist);

module.exports = router;
