import express from 'express';
import { body } from 'express-validator';
import * as categoryController from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// All category routes require authentication
router.use(protect);

// Read categories (all authenticated roles)
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);

// Create category (admin, manager)
router.post(
  '/',
  authorize('admin', 'manager'),
  validate([
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('description').optional().trim(),
    body('icon').optional().trim(),
    body('fieldDefinitions').optional().isArray().withMessage('fieldDefinitions must be an array')
  ]),
  categoryController.createCategory
);

// Update category (admin, manager)
router.put(
  '/:id',
  authorize('admin', 'manager'),
  validate([
    body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
    body('description').optional().trim(),
    body('icon').optional().trim(),
    body('fieldDefinitions').optional().isArray().withMessage('fieldDefinitions must be an array')
  ]),
  categoryController.updateCategory
);

// Delete category (admin only, blocked if assets use it)
router.delete('/:id', authorize('admin'), categoryController.deleteCategory);

export default router;
