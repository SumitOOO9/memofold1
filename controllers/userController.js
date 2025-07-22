const User = require("../models/user");
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