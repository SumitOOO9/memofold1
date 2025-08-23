const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const { promisify } = require("util");

const unlinkAsync = promisify(fs.unlink);

// Temporary storage for files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "tmp/uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${req.user.id}_${uniqueSuffix}${ext}`);
  },
});

// Create the upload instance
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (JPEG, JPG, PNG, GIF) are allowed"));
    }
  }
});

// Middleware to upload SINGLE image to Cloudinary for posts
const uploadSingleToCloudinary = async (req, res, next) => {
  try {
    // Check if file exists
    if (!req.file) {
      return next();
    }
    
    // Upload single file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "posts",
      public_id: `${req.user.id}_${Date.now()}_${path.parse(req.file.originalname).name}`
    });
    
    // Add Cloudinary URL to request object as SINGLE string (not array)
    req.imageUrl = result.secure_url;
    
    // Clean up temp file after successful upload
    await unlinkAsync(req.file.path);
    
    next();
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    
    // Clean up temp file on error
    if (req.file && req.file.path) {
      await unlinkAsync(req.file.path).catch(err => 
        console.error("Error deleting temp file:", err)
      );
    }
    
    res.status(500).json({ error: "Failed to upload image" });
  }
};

// Middleware to clean up temp files
const cleanupTempFiles = (req, res, next) => {
  // Store reference to file for later cleanup
  const file = req.file;
  
  // Clean up file after response is sent (safety net)
  res.on("finish", () => {
    if (file && file.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }
  });
  
  next();
};

// Error handling middleware for multer errors
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ error: "Unexpected field. Use 'image' for single file upload." });
    }
  }
  
  if (error.message === "Only images (JPEG, JPG, PNG, GIF) are allowed") {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
};

module.exports = {
  upload, // Export the upload instance directly
  uploadSingle: upload.single("image"), // For single image upload
  uploadSingleToCloudinary, // Single image upload to Cloudinary
  cleanupTempFiles,
  handleMulterError
};