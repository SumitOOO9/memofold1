const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const PasswordReset = require("../models/passwordReset");
const { sendVerificationCode } = require("../utils/sendEmail");
const bcrypt = require("bcryptjs");
const User = require("../models/user")
// Support both /register and /signup for compatibility
router.post("/register", register);
router.post("/signup", register); // ✅ Added for frontend compatibility
router.post("/login", login);


router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }
    console.log(email);
    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log(user);
    if (!user) {
      // For security, don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: "If the email exists, a reset code has been sent"
      });
    }

    // Generate verification code (6 digits)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save reset code with expiration
    await PasswordReset.create({
      email: email.toLowerCase(),
      code: code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send email with verification code
    const emailSent = await sendVerificationCode(email, code);
    console.log(emailSent);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email"
      });
    }

    res.status(200).json({
      success: true,
      message: "Verification code sent to email"
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password reset request"
    });
  }
});

// Verify code and reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, verification code, and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    // Find valid reset code
    const resetRecord = await PasswordReset.findOne({
      email: email.toLowerCase(),
      code: code,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code"
      });
    }

    // Find user and update password
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    // Hash and update password (using your existing method)
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Delete the used reset code
    await PasswordReset.deleteOne({ _id: resetRecord._id });

    res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password reset"
    });
  }
});




module.exports = router;