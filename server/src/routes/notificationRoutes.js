import express from 'express';
import { getNotifications } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Real-time notifications for in-app alert bell
router.get('/', protect, getNotifications);

export default router;
