import express from 'express';
import { uploadMiddleware, uploadImage } from '../controllers/uploadController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Multer error handling wrapper
const handleUpload = (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds maximum permitted limit of 5 MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file'
      });
    }
    next();
  });
};

// Upload image endpoint (Admin, Manager)
router.post('/image', protect, authorize('admin', 'manager'), handleUpload, uploadImage);

export default router;
