const cloudinary = require('../config/cloudinary');
const { promisify } = require('util');
const fs = require('fs');

const unlinkAsync = promisify(fs.unlink);

class UploadService {
  static async processBase64Image(base64String, userId) {
    if (!base64String || !base64String.startsWith('data:image/')) {
      return null;
    }

    try {
      const matches = base64String.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return null;
      }

      const imageType = matches[1];
      const imageData = matches[2];
      
      const validImageTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
      if (!validImageTypes.includes(imageType.toLowerCase())) {
        return null;
      }

      const result = await cloudinary.uploader.upload(
        `data:image/${imageType};base64,${imageData}`,
        {
          folder: 'posts',
          public_id: `post_${userId}_${Date.now()}`,
          resource_type: 'image'
        }
      );

return {
      url: result.secure_url,
      publicId: result.public_id
    };    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      return null;
    }
  }

  static async uploadToCloudinary(filePath, userId, originalName) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: "posts",
        public_id: `${userId}_${Date.now()}_${originalName}`
      });
      
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image');
    }
  }

  static async cleanupFile(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await unlinkAsync(filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
}

module.exports = UploadService;