const User = require("../models/user");

exports.uploadProfilePic = async (req, res) => {
  try {
    const profilePicUrl = `/uploads/profilePics/${req.file.filename}`;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic: profilePicUrl },
      { new: true }
    );
    res.json({ profilePicUrl: updatedUser.profilePic });
  } catch (error) {
    res.status(500).json({ message: "Upload failed" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ message: "User fetch failed" });
  }
};
