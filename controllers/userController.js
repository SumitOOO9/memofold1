const User = require("../models/user");
const Profile = require("../models/profile");
const cloudinary = require("../config/cloudinary");

exports.uploadProfilePic = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      public_id: `${req.user.username}_profile`,
      overwrite: true,
    });

    // Update user with Cloudinary URL
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic: result.secure_url },
      { new: true }
    );

    res.json({ 
      profilePicUrl: updatedUser.profilePic,
      cloudinaryId: result.public_id 
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      message: "Upload failed",
      error: error.message 
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      message: "User fetch failed",
      error: error.message 
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // user details (without password)
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // profile description
    const profile = await Profile.findOne({ user: userId });
    const description = profile?.description || "";

    res.status(200).json({
      success: true,
      user,
      description,
    });
  } catch (err) {
    console.error("Error fetching user by ID:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user data",
    });
  }
};
