const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { uploadProfilePic, getMe } = require("../controllers/userController");

router.post("/upload-profile-pic", authenticate, upload.single("profilePic"), uploadProfilePic);
router.get("/me", authenticate, getMe);

module.exports = router;
