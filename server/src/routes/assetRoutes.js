import express from 'express';
import { body } from 'express-validator';
import * as assetController from '../controllers/assetController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// All asset routes require authentication
router.use(protect);

// 1. Meta and aggregate routes (must precede /:id)
router.get('/meta/departments', assetController.getDistinctDepartments);

// 2. Collection routes
router.get('/', assetController.getAssets);

router.post(
  '/',
  authorize('admin', 'manager'),
  validate([
    body('name').trim().notEmpty().withMessage('Asset name is required'),
    body('category').isMongoId().withMessage('Valid category ID is required'),
    body('subcategory').optional().trim(),
    body('status').optional().isIn(['active', 'inactive', 'retired']).withMessage('Invalid status'),
    body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be greater than or equal to 0'),
    body('expectedLifespanYears').optional().isFloat({ min: 0 }).withMessage('Expected lifespan must be greater than or equal to 0')
  ]),
  assetController.createAsset
);

// 3. Single Asset Specific Routes
router.get('/:id', assetController.getAssetById);

router.put(
  '/:id',
  authorize('admin', 'manager'),
  validate([
    body('name').optional().trim().notEmpty().withMessage('Asset name cannot be empty'),
    body('category').optional().isMongoId().withMessage('Valid category ID is required'),
    body('subcategory').optional().trim(),
    body('status').optional().isIn(['active', 'inactive', 'retired']).withMessage('Invalid status'),
    body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be greater than or equal to 0'),
    body('expectedLifespanYears').optional().isFloat({ min: 0 }).withMessage('Expected lifespan must be greater than or equal to 0')
  ]),
  assetController.updateAsset
);

router.delete('/:id', authorize('admin'), assetController.deleteAsset);

// 4. Asset QR Code Generation
router.get('/:id/qr', assetController.getAssetQrCode);

// 5. Asset Audit Trail History
router.get('/:id/audit', assetController.getAssetAuditHistory);

export default router;
