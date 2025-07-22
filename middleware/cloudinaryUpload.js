const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Temporary storage for file before Cloudinary upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "tmp/uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.username}_profile${ext}`);
  },
});

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

// Middleware to clean up temp files after upload
const cleanupTempFiles = (req, res, next) => {
  if (req.file) {
    const tempPath = req.file.path;
    res.on("finish", () => {
      fs.unlink(tempPath, (err) => {
        if (err) console.error("Error deleting temp file:", err);
      });
    });
  }
  next();
};

module.exports = { upload, cleanupTempFiles };
