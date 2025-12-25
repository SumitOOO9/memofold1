const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validateMiddleware = require("../middleware/validateMiddleware");
const { registerValidation, loginValidation } = require("../validation/userValidation");

// User authentication
router.post("/register", validateMiddleware(registerValidation), authController.register);
router.post("/signup", validateMiddleware(registerValidation), authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

// Password reset flow
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
