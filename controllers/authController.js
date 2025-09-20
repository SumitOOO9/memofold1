const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { sendVerificationCode } = require("../service/sendEmail");
const passwordReset = require("../models/passwordReset");
const cache = require("../utils/cache");

exports.register = async (req, res) => {
  try {
    const { realname, username, email, password, profilePic } = req.body;

    const existingUser = await User.findOne({
      $or: [
        { username: username.trim() },
        { email: email.trim().toLowerCase() },
      ],
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username or email already exists." });
    }

    const newUser = new User({
      realname: realname.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,        
      profilePic: profilePic || "",
    });

    await newUser.save();
        if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is missing in environment.");
      return res.status(500).json({ message: "Server misconfiguration." });
    }

    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      message: "User registered successfully.",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        realname: newUser.realname,
        email: newUser.email,
        profilePic: newUser.profilePic,
      },
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    return res.status(500).json({ message: "Internal server error during registration." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({ message: "Email or username and password are required." });
    }

    const query = email
      ? { email: email.toLowerCase().trim() }
      : { username: username.trim() };

    // Always fetch from DB to verify password
    const user = await User.findOne(query).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is missing in environment.");
      return res.status(500).json({ message: "Server misconfiguration." });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Cache the user object WITHOUT password
    const { password: pwd, ...safeUser } = user.toObject();
    const cacheKey = email ? `user:${email}` : `user:${username}`;
    await cache.set(cacheKey, safeUser, 3600); 

    return res.status(200).json({
      message: "Login successful.",
      token,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Internal server error during login." });
  }
};


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Security: Always respond success, never leak user existence
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (user) {
      await passwordReset.create({
        email: email.toLowerCase(),
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 min expiry
      });

      await sendVerificationCode(email, code);
    }

    res.status(200).json({ success: true, message: "If the email exists, a reset code has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error during password reset request." });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Email, verification code, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const resetRecord = await passwordReset.findOne({
      email: email.toLowerCase(),
      code,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    user.password = newPassword; // will be hashed in schema pre-save
    await user.save();

    await passwordReset.deleteOne({ _id: resetRecord._id });

    res.status(200).json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error during password reset." });
  }
};