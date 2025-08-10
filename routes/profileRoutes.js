const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const User = require("../models/User");

// GET user description
router.get("/description", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("discription");
    res.status(200).json({
      success: true,
      description: user.discription
    });
  } catch (err) {
    console.error("Error getting description:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get user description"
    });
  }
});

// POST/PUT update user description
router.put("/description", authenticate, async (req, res) => {
  try {
    const { description } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { discription: description },
      { new: true }
    ).select("discription");

    res.status(200).json({
      success: true,
      message: "Description updated successfully",
      description: updatedUser.discription
    });
  } catch (err) {
    console.error("Error updating description:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update description"
    });
  }
});

module.exports = router;