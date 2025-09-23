const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { sendVerificationCode } = require("../service/sendEmail");
const passwordReset = require("../models/passwordReset");
const cache = require("../utils/cache");
const bcrypt = require("bcryptjs");
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
      return res
        .status(400)
        .json({ message: "Username or email already exists." });
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
    return res
      .status(500)
      .json({ message: "Internal server error during registration." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = email || username;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email/username and password are required." });
    }

    const cacheKey = `user:${identifier}`;

    let cachedUser = await cache.get(cacheKey); 
    let user;
    console.log("cachedUser",cachedUser);
    if (cachedUser) {
      user = {
        _id: cachedUser._id,
        username: cachedUser.username,
        email: cachedUser.email,
        password: cachedUser.password
      };
    } else {
      user = await User.findOne(email ? { email } : { username }).select("+password");
      console.log("user",user);
      if (!user) return res.status(400).json({ message: "Invalid credentials." });

      await cache.set(cacheKey, JSON.stringify({
  _id: user._id.toString(),
  username: user.username,
  email: user.email,
  password: user.password
}), {
  EX: 18000 
});
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

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

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (user) {
      await passwordReset.create({
        email: email.toLowerCase(),
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), 
      });

      await sendVerificationCode(email, code);
    }

    res
      .status(200)
      .json({
        success: true,
        message: "If the email exists, a reset code has been sent.",
      });
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(500)
      .json({ message: "Server error during password reset request." });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res
        .status(400)
        .json({
          message: "Email, verification code, and new password are required.",
        });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    const resetRecord = await passwordReset.findOne({
      email: email.toLowerCase(),
      code,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    user.password = newPassword; // will be hashed in schema pre-save
    await user.save();

    await passwordReset.deleteOne({ _id: resetRecord._id });

    res
      .status(200)
      .json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error during password reset." });
  }
};
