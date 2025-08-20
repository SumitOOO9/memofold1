const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { upload, cleanupTempFiles } = require("../middleware/cloudinaryUpload");
const { uploadProfilePic, getMe } = require("../controllers/userController");
const { getUserById } = require("../controllers/userController");

router.post(
  "/upload-profile-pic",
  authenticate,
  upload.single("profilePic"),
  cleanupTempFiles,
  uploadProfilePic
);
router.get("/me", authenticate, getMe);

router.get("/user/:userId", authenticate, getUserById);


module.exports = router;