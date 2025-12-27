// controllers/userController.js
const cloudinary = require("../config/cloudinary");
const UserService = require("../service/userService");
const streamifier = require("streamifier");


exports.uploadProfilePic = async (req, res) => {
  try {
    console.log("Upload profile pic request received");
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded:" });
    }

    if (!req.imageUrl) {
      return res.status(500).json({ message: "Upload failed. Cloudinary did not return URL." });
    }
    const updatedUser = await UserService.updateUserFields(req.user.id, { profilePic: req.imageUrl });

    res.json({
      profilePicUrl: updatedUser.profilePic
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};


exports.getMe = async (req, res) => {
  try {
    const data = await UserService.getUserWithProfile(req.user.id);
    res.status(200).json(data);
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "User fetch failed", error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

    const data = await UserService.getUserWithProfile(userId);
    if (!data.user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error("Error fetching user by ID:", err);
    res.status(500).json({ success: false, message: "Failed to fetch user data" });
  }
};

exports.updateUserAndProfile = async (req, res) => {
  try {
    const { username, email, description } = req.body;
    if (username === undefined && email === undefined && description === undefined) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const result = await UserService.updateUserAndProfileAtomic(req.user.id, {
      username,
      email,
      description
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: result.updatedUser,
      profile: result.updatedProfile
    });
  } catch (err) {
    console.error("Update profile error:", err);

    if (err.message === 'Username already taken' || err.message === 'Email already registered' || err.message === 'Invalid email format' || err.message.startsWith('Description')) {
      return res.status(400).json({ success: false, message: err.message });
    }

    res.status(500).json({ success: false, message: "Update failed", error: err.message });
  }
};

exports.searchUsers = async (req, res) => {
  const { q, limit } = req.query;
    if (!q) return res.status(400).json({ message: 'Query is required' });

    try {
      const results = await UserService.searchUsers(q, parseInt(limit) || 10);
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Search failed' });
    }
  }

