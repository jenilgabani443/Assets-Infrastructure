import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Register (first user can register as admin without token; subsequent requires admin)
router.post(
  '/register',
  optionalAuth,
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').optional().isIn(['admin', 'manager', 'technician']).withMessage('Invalid role specified')
  ]),
  authController.register
);

// Login (rate limited)
router.post(
  '/login',
  authLimiter,
  validate([
    body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ]),
  authController.login
);

// Get current authenticated user
router.get('/me', protect, authController.getMe);

// Change password
router.patch(
  '/change-password',
  protect,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
  ]),
  authController.changePassword
);

// Alias PUT /update-password
router.put(
  '/update-password',
  protect,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
  ]),
  authController.changePassword
);

export default router;
