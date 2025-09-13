// const express = require("express");
// const router = express.Router();
// const Profile = require("../models/profile");
// const { authenticate } = require("../middleware/authMiddleware");

// // GET user description
// router.get("/description", authenticate, async (req, res) => {
//   try {
//     if (!req.user?.id) {
//       return res.status(400).json({
//         success: false,
//         message: "User ID is missing"
//       });
//     }

//     const profile = await Profile.findOne({ user: req.user.id });
//     const description = profile?.description || "";

//     res.status(200).json({
//       success: true,
//       description
//     });
//   } catch (err) {
//     console.error("Error getting description:", err);
//     res.status(500).json({
//       success: false,
//       message: "Failed to get user description"
//     });
//   }
// });

// // PUT update user description (creates if doesn't exist)
// router.put("/description", authenticate, async (req, res) => {
//   try {
//     const { description } = req.body;

//     if (!req.user?.id) {
//       return res.status(400).json({
//         success: false,
//         message: "User ID is missing"
//       });
//     }

//     if (typeof description !== 'string') {
//       return res.status(400).json({
//         success: false,
//         message: "Description must be a string"
//       });
//     }

//     // This will create with the provided description if profile doesn't exist
//     const profile = await Profile.updateOrCreate(req.user.id, description);

//     res.status(200).json({
//       success: true,
//       message: profile.__v === 0 ? 
//         "Profile created with description" : 
//         "Description updated successfully",
//       description: profile.description
//     });
//   } catch (err) {
//     console.error("Error updating description:", err);
    
//     let message = "Failed to update description";
//     if (err.name === 'ValidationError') {
//       message = Object.values(err.errors).map(val => val.message).join(', ');
//     } else if (err.code === 11000) {
//       message = "Duplicate profile detected - please try again";
//     }
    
//     res.status(500).json({
//       success: false,
//       message
//     });
//   }
// });

// module.exports = router;