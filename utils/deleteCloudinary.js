const cloudinary = require("../config/cloudinary");

const deleteFromCloudinary = async (publicId, type) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: type === "video" ? "video" : "image",
    });
  } catch (err) {
    console.error("Cloudinary delete failed:", err);
  }
};

module.exports = deleteFromCloudinary;
