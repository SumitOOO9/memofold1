const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const pushController = require("../controllers/pushController");

const router = express.Router();

router.post("/subscribe", authenticate, pushController.subscribe);

module.exports = router;
