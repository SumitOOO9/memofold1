const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

// Use memory storage, not disk
const storage = multer.memoryStorage();

const uploadSingle = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {

    const imageTypes = /jpeg|jpg|png|gif|webp/;
    const videoTypes = /mp4|mov|avi|mkv|webm/;

    const ext = file.originalname.toLowerCase();
    const mime = file.mimetype;

    const isImage =
      imageTypes.test(ext) && imageTypes.test(mime);

    const isVideo =
      videoTypes.test(ext) && mime.startsWith("video/");

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
    folder: isVideo ? "post_videos" : "profile_pics", // folder based on type
    resource_type: isVideo ? "video" : "image",
    public_id: `${req.user.id}_${Date.now()}`
  };

  const uploadStream = cloudinary.uploader.upload_stream(
    uploadOptions,
    (error, result) => {
      if (error) {
        console.error("Cloudinary upload error:", error);
        return res.status(500).json({ error: "Upload failed" });
      }

      // ⏱️ Enforce 15 sec video limit
      // console.log("Upload result:", result);
      if (isVideo && result.duration > 15) {
        return res.status(400).json({
          error: "Video duration must be 15 seconds or less"
        });
      }

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
