const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

// Use memory storage, not disk
const storage = multer.memoryStorage();

const uploadSingle = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(file.originalname.toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPEG, JPG, PNG, GIF, WEBP) are allowed"));
    }
  }
}).single("image"); // 🔑 field name in Postman

// Cloudinary middleware
const uploadSingleToCloudinary = (req, res, next) => {
  if (!req.file) return next();

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder: "profile_pics",
      public_id: `${req.user.id}_${Date.now()}`
    },
    (error, result) => {
      if (error) {
        console.error("Cloudinary upload error:", error);
        return res.status(500).json({ error: "Failed to upload image" });
      }

      req.imageUrl = result.secure_url;
      next();
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
};

module.exports = {
  uploadSingle,
  uploadSingleToCloudinary
};
