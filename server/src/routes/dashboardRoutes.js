import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected dashboard stats endpoint
router.get('/stats', protect, getDashboardStats);

export default router;
