const express = require("express");
const router = express.Router();
const Profile = require("../models/profile");
const { authenticate } = require("../middleware/authMiddleware");

// GET user description
router.get("/description", authenticate, async (req, res) => {
  try {
    const profile = await Profile.findOneAndUpdate(
      { user: req.user.id },  // Using .id consistently
      { $setOnInsert: { description: "" } },
      { 
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({
      success: true,
      description: profile.description
    });
  } catch (err) {
    console.error("Error getting description:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get user description"
    });
  }
});

// PUT update user description
router.put("/description", authenticate, async (req, res) => {
  try {
    const { description } = req.body;

    if (typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Description must be a string"
      });
    }

    const profile = await Profile.findOneAndUpdate(
      { user: req.user.id },  // Using .id consistently
      { description },
      { 
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: "Description updated successfully",
      description: profile.description
    });
  } catch (err) {
    console.error("Error updating description:", err);
    
    let message = "Failed to update description";
    if (err.name === 'ValidationError') {
      message = Object.values(err.errors).map(val => val.message).join(', ');
    }
    
    res.status(500).json({
      success: false,
      message
    });
  }
});

module.exports = router;