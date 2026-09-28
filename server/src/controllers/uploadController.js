import multer from 'multer';
import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import { sendSuccess } from '../utils/apiResponse.js';

// Multer in-memory storage config
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type: Only image files (JPEG, PNG, WEBP, GIF, SVG) are allowed'));
    }
  }
}).single('image');

/**
 * Upload image to Cloudinary from memory buffer
 */
export const uploadImage = async (req, res, next) => {
  try {
    // Check if Cloudinary credentials are valid
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message:
          'Cloudinary image storage service is unavailable or not configured. Please configure valid CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the environment.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided. Please provide an image using the 'image' field."
      });
    }

    // Configure Cloudinary explicitly with environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Stream upload buffer to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'infrastructure_assets',
          resource_type: 'image'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: uploadResult.secure_url,
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        bytes: uploadResult.bytes,
        format: uploadResult.format
      }
    });
  } catch (error) {
    if (
      error.message?.includes('api_key') ||
      error.message?.includes('credentials') ||
      error.http_code === 401
    ) {
      return res.status(503).json({
        success: false,
        message: `Cloudinary storage service configuration error: ${error.message}. Please check your CLOUDINARY_* environment credentials.`
      });
    }
    next(error);
  }
};

export default {
  uploadMiddleware,
  uploadImage
};
