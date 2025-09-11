const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const UploadService = require('../service/uploadService');

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
  limits: { fileSize: 5 * 1024 * 1024 },
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

// Middleware to upload single image to Cloudinary
const uploadSingleToCloudinary = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }
    
    const imageUrl = await UploadService.uploadToCloudinary(
      req.file.path, 
      req.user.id, 
      path.parse(req.file.originalname).name
    );
    
    req.imageUrl = imageUrl;
    
    await UploadService.cleanupFile(req.file.path);
    
    next();
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    
    await UploadService.cleanupFile(req.file?.path);
    
    res.status(500).json({ error: "Failed to upload image" });
  }
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
  upload,
  uploadSingle: upload.single("image"),
  uploadSingleToCloudinary,
  handleMulterError
};