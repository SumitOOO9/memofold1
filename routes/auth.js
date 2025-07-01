const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");

// Support both /register and /signup for compatibility
router.post("/register", register);
router.post("/signup", register); // ✅ Added for frontend compatibility
router.post("/login", login);

module.exports = router;