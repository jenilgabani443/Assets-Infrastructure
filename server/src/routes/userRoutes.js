import express from 'express';
import { body, param } from 'express-validator';
import * as userController from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Admin-only guard for all user management routes
router.use(protect, authorize('admin'));

// List users with search and pagination
router.get('/', userController.getUsers);

// Create user
router.post(
  '/',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').optional().isIn(['admin', 'manager', 'technician']).withMessage('Role must be admin, manager, or technician'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ]),
  userController.createUser
);

// Get single user by ID
router.get('/:id', userController.getUserById);

// Update user details (name, role, isActive)
router.put(
  '/:id',
  validate([
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('role').optional().isIn(['admin', 'manager', 'technician']).withMessage('Role must be admin, manager, or technician'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ]),
  userController.updateUser
);

// Toggle or update status
router.patch(
  '/:id/status',
  validate([
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ]),
  userController.updateUserStatus
);

// Deactivate user alias
router.patch(
  '/:id/deactivate',
  (req, res, next) => {
    req.body.isActive = false;
    next();
  },
  userController.updateUserStatus
);

export default router;
