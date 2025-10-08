// controllers/authController.js
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cache = require("../utils/cache");
const passwordReset = require("../models/passwordReset");
const { sendVerificationCode } = require("../service/sendEmail");
const { upsertStreamUser, generateStreamToken, ensureStreamUsersExist } = require("../lib/stream");

// Helper: generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// ------------------ REGISTER ------------------
const register = async (req, res) => {
  try {
    const { realname, username, email, password, profilePic } = req.body;

    if (!realname || !username || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [
        { username: username.trim() },
        { email: email.trim().toLowerCase() },
      ],
    });

    if (existingUser)
      return res.status(400).json({ message: "Username or email already exists." });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      realname: realname.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      profilePic: profilePic || "",
    });
    await newUser.save();

    // Upsert user in Stream
    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        name: newUser.realname || newUser.username,
        image: newUser.profilePic || null,
        role: "user",
      });
    } catch (err) {
      console.error("❌ Stream upsert failed during registration:", err.message);
    }

    const token = generateToken(newUser);

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
    console.error("❌ Register error:", err.message);
    return res.status(500).json({ message: "Internal server error during registration." });
  }
};

// ------------------ LOGIN ------------------
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = email?.toLowerCase().trim() || username?.trim();

    if (!identifier || !password)
      return res.status(400).json({ message: "Email/username and password are required." });

    const cacheKey = `user:${identifier}`;
    let cachedUser = await cache.get(cacheKey);
    let user;

    if (cachedUser) {
      try {
        user = JSON.parse(cachedUser);
      } catch {
        user = null;
      }
    }

    if (!user) {
      const query = email
        ? { email: identifier }
        : { username: identifier };

      user = await User.findOne(query).select("+password");
      if (!user) return res.status(400).json({ message: "Invalid credentials." });

      await cache.set(
        cacheKey,
        JSON.stringify({
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          password: user.password,
          realname: user.realname,
          profilePic: user.profilePic || "",
        }),
        { EX: 18000 } // 5 hours
      );
    } else {
      // Fetch full user from DB to get password
      user = await User.findById(user._id).select("+password");
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

    // Upsert in Stream
    try {
      await upsertStreamUser({
        id: user._id.toString(),
        name: user.realname || user.username,
        image: user.profilePic || null,
        role: "user",
      });
    } catch (err) {
      console.error("❌ Stream upsert failed during login:", err.message);
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        username: user.username,
        realname: user.realname,
        email: user.email,
        profilePic: user.profilePic,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    return res.status(500).json({ message: "Internal server error during login." });
  }
};

// ------------------ FORGOT PASSWORD ------------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (user) {
      await passwordReset.create({
        email: email.toLowerCase(),
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      sendVerificationCode(email, code).catch((err) =>
        console.error("Email error:", err.message)
      );
    }

    res.status(200).json({
      success: true,
      message: "If the email exists, a reset code has been sent.",
    });
  } catch (err) {
    console.error("❌ Forgot password error:", err.message);
    res.status(500).json({ message: "Server error during password reset request." });
  }
};

// ------------------ RESET PASSWORD ------------------
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return res.status(400).json({ message: "Email, verification code, and new password are required." });

    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    const resetRecord = await passwordReset.findOne({
      email: email.toLowerCase(),
      code,
      expiresAt: { $gt: new Date() },
    });
    if (!resetRecord) return res.status(400).json({ message: "Invalid or expired verification code." });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "User not found." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await passwordReset.deleteOne({ _id: resetRecord._id });

    await cache.del(`user:${user.email}`);
    await cache.del(`user:${user.username}`);

    res.status(200).json({ success: true, message: "Password reset successfully." });
  } catch (err) {
    console.error("❌ Reset password error:", err.message);
    res.status(500).json({ message: "Server error during password reset." });
  }
};

// ------------------ STREAM TOKEN ------------------
const getStreamToken = async (req, res) => {
  try {
    if (!req.user || !req.user.id)
      return res.status(401).json({ message: "Unauthorized: User ID not found" });

    const userId = req.user.id.toString();

    await upsertStreamUser({
      id: userId,
      name: req.user.realname || req.user.username || `User-${userId}`,
      image: req.user.profilePic || null,
      role: "user",
    });

    const token = generateStreamToken(userId);
    res.status(200).json({ token, userId });
  } catch (err) {
    console.error("❌ getStreamToken error:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ------------------ ENSURE STREAM USERS ------------------
const ensureUsersExist = async (req, res) => {
  try {
    const { users } = req.body;
    if (!users || !users.length) return res.status(400).json({ message: "No users provided" });

    await ensureStreamUsersExist(users);
    res.status(200).json({ message: "Users ensured in Stream" });
  } catch (err) {
    console.error("❌ ensureUsersExist error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getStreamToken,
  ensureUsersExist,
};
