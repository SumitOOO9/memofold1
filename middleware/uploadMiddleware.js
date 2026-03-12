const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const path = require("path");

// Use memory storage, not disk
const storage = multer.memoryStorage();

const uploadSingle = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedImageExtensions = [
      ".jpeg",
      ".jpg",
      ".png",
      ".gif",
      ".webp",
      ".dng",
      ".heic",
      ".heif",
      ".avif",
      ".bmp",
      ".tif",
      ".tiff"
    ];
    const allowedImageMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/dng",
      "image/x-adobe-dng",
      "image/heic",
      "image/heif",
      "image/avif",
      "image/bmp",
      "image/tiff"
    ];
    const allowedVideoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();

    const isRawLikeByExtension = [".dng", ".heic", ".heif"].includes(ext);
    const isImageByExtension = allowedImageExtensions.includes(ext);
    const isImageByMime =
      allowedImageMimes.includes(mime) || mime.startsWith("image/");
    const isRawWithGenericMime = isRawLikeByExtension && mime === "application/octet-stream";

    const isImage = (isImageByExtension && isImageByMime) || isRawWithGenericMime;
    const isVideo = allowedVideoExtensions.includes(ext) && mime.startsWith("video/");

    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error("Only image or video files are allowed"));
    }
  }
}).single("media"); 


// Cloudinary middleware
const uploadSingleToCloudinary = (req, res, next) => {
  if (!req.file) return next();

  const isVideo = req.file.mimetype.startsWith("video/");

  const uploadOptions = {
    folder: isVideo ? "post_videos" : "post_images",
    resource_type: isVideo ? "video" : "image",
    public_id: `${req.user.id}_${Date.now()}`
  };

  const uploadStream = cloudinary.uploader.upload_stream(
    uploadOptions,
    (error, result) => {
      if (error) {
        return res.status(500).json({ error: "Upload failed" });
      }

      // ✅ STORE BOTH URL + PUBLIC ID
      req.media = {
        url: result.secure_url,
        publicId: result.public_id,
        type: isVideo ? "video" : "image"
      };

      // backward compatibility
      if (isVideo) {
        req.videoUrl = result.secure_url;
      } else {
        req.imageUrl = result.secure_url;
      }

      next();
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
};






module.exports = {
  uploadSingle,
  uploadSingleToCloudinary
};
