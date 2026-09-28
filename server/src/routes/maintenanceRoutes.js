import express from 'express';
import { body } from 'express-validator';
import * as maintenanceController from '../controllers/maintenanceController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// All maintenance endpoints require authentication
router.use(protect);

// 1. Collection routes
router.get('/', maintenanceController.getMaintenanceLogs);

router.post(
  '/',
  authorize('admin', 'manager'),
  validate([
    body('asset').isMongoId().withMessage('Valid asset ID is required'),
    body('title').trim().notEmpty().withMessage('Maintenance title is required'),
    body('type').isIn(['preventive', 'corrective', 'inspection']).withMessage('Valid maintenance type is required'),
    body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required')
  ]),
  maintenanceController.createMaintenanceLog
);

// 2. Individual item routes
router.get('/:id', maintenanceController.getMaintenanceLogById);

router.put(
  '/:id',
  authorize('admin', 'manager'),
  validate([
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('type').optional().isIn(['preventive', 'corrective', 'inspection']).withMessage('Invalid maintenance type'),
    body('scheduledDate').optional().isISO8601().withMessage('Invalid scheduled date')
  ]),
  maintenanceController.updateMaintenanceLog
);

// Partial update (accessible to Admin, Manager, and Assigned Technician)
router.patch(
  '/:id',
  validate([
    body('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'overdue']).withMessage('Invalid status'),
    body('cost').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Cost must be positive')
  ]),
  maintenanceController.patchMaintenanceLog
);

// Start maintenance workflow
router.patch('/:id/start', maintenanceController.startMaintenance);

// Complete maintenance workflow
router.patch(
  '/:id/complete',
  validate([
    body('cost').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Cost must be positive')
  ]),
  maintenanceController.completeMaintenance
);

router.delete('/:id', authorize('admin', 'manager'), maintenanceController.deleteMaintenanceLog);

export default router;
