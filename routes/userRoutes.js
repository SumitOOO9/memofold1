const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {  uploadSingleToCloudinary, uploadSingle } = require("../middleware/uploadMiddleware");
const { uploadProfilePic, getMe,  } = require("../controllers/userController");
const { getUserById } = require("../controllers/userController");

router.post(
  "/upload-profile-pic",
  authenticate,
  uploadSingle,
  uploadSingleToCloudinary,
  uploadProfilePic
);
router.get("/me", authenticate, getMe);

router.get("/user/:userId", authenticate, getUserById);


module.exports = router;