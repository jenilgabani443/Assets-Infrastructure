import MaintenanceLog from '../models/MaintenanceLog.js';
import Asset from '../models/Asset.js';
import LifecycleEvent from '../models/LifecycleEvent.js';
import { markOverdueMaintenance } from '../utils/maintenanceHelper.js';
import { computeDiff, logAudit } from '../utils/auditLogger.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * List maintenance logs
 * - Runs overdue check
 * - Filters: asset, status, type, technician, from/to date, overdue=true
 * - Technicians can only view tasks assigned to them
 * - Pagination & populated references
 */
export const getMaintenanceLogs = async (req, res, next) => {
  try {
    // Run overdue checker
    await markOverdueMaintenance();

    const {
      asset,
      status,
      type,
      technician,
      from,
      to,
      overdue,
      page = 1,
      limit = 10,
      sort = '-scheduledDate'
    } = req.query;

    const query = {};

    // Technicians may ONLY view logs assigned to them
    if (req.user.role === 'technician') {
      query.technician = req.user._id;
    } else if (technician) {
      query.technician = technician;
    }

    if (asset) {
      query.asset = asset;
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (from || to) {
      query.scheduledDate = {};
      if (from) query.scheduledDate.$gte = new Date(from);
      if (to) query.scheduledDate.$lte = new Date(to);
    }

    if (overdue === 'true' || overdue === true) {
      query.$or = [
        { status: 'overdue' },
        { status: 'scheduled', scheduledDate: { $lt: new Date() } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      MaintenanceLog.find(query)
        .populate('asset', 'name assetTag category subcategory lifecycleStage status location')
        .populate('technician', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      MaintenanceLog.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      data: logs,
      total,
      page: pageNum,
      pages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single maintenance log by ID
 */
export const getMaintenanceLogById = async (req, res, next) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id)
      .populate('asset', 'name assetTag category subcategory lifecycleStage status location department cost')
      .populate('technician', 'name email role');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance log not found'
      });
    }

    // Role check: technicians can only access logs assigned to them
    if (req.user.role === 'technician') {
      const assignedId = log.technician?._id ? log.technician._id.toString() : log.technician?.toString();
      if (assignedId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view maintenance logs assigned to you.'
        });
      }
    }

    return sendSuccess(res, 'Maintenance log retrieved', log);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new maintenance log (Admin, Manager)
 */
export const createMaintenanceLog = async (req, res, next) => {
  try {
    const {
      asset: assetId,
      title,
      type,
      status = 'scheduled',
      scheduledDate,
      completedDate,
      cost = 0,
      technician,
      notes = ''
    } = req.body;

    if (!assetId || !title || !type || !scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: asset, title, type, and scheduledDate are required'
      });
    }

    const assetDoc = await Asset.findById(assetId);
    if (!assetDoc) {
      return res.status(404).json({
        success: false,
        message: 'Specified asset does not exist'
      });
    }

    const log = new MaintenanceLog({
      asset: assetDoc._id,
      title: title.trim(),
      type,
      status,
      scheduledDate: new Date(scheduledDate),
      completedDate: completedDate ? new Date(completedDate) : null,
      cost: Number(cost) || 0,
      technician: technician || null,
      notes: notes.trim()
    });

    await log.save();

    await logAudit({
      user: req.user._id,
      action: 'create',
      entity: 'MaintenanceLog',
      entityId: log._id,
      summary: `Created ${type} maintenance task '${title}' for asset ${assetDoc.assetTag}`
    });

    const populatedLog = await MaintenanceLog.findById(log._id)
      .populate('asset', 'name assetTag category subcategory lifecycleStage status')
      .populate('technician', 'name email role');

    return sendSuccess(res, 'Maintenance log created successfully', populatedLog, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Full update of maintenance log (Admin, Manager)
 */
export const updateMaintenanceLog = async (req, res, next) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance log not found'
      });
    }

    const beforeSnapshot = log.toObject();

    const updatableFields = [
      'title',
      'type',
      'status',
      'scheduledDate',
      'completedDate',
      'cost',
      'technician',
      'notes'
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        log[field] = req.body[field];
      }
    }

    // Auto set completedDate if marked completed
    if (log.status === 'completed' && !log.completedDate) {
      log.completedDate = new Date();
    }

    await log.save();

    const diff = computeDiff(beforeSnapshot, log);

    await logAudit({
      user: req.user._id,
      action: 'update',
      entity: 'MaintenanceLog',
      entityId: log._id,
      summary: `Updated maintenance log '${log.title}'`,
      changes: diff
    });

    const populatedLog = await MaintenanceLog.findById(log._id)
      .populate('asset', 'name assetTag category subcategory lifecycleStage status')
      .populate('technician', 'name email role');

    return sendSuccess(res, 'Maintenance log updated successfully', populatedLog);
  } catch (error) {
    next(error);
  }
};

/**
 * Partial update (status, notes, cost)
 * Available to Admin, Manager, and Assigned Technician
 */
export const patchMaintenanceLog = async (req, res, next) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance log not found'
      });
    }

    // Check technician permission
    if (req.user.role === 'technician') {
      const assignedId = log.technician ? log.technician.toString() : null;
      if (assignedId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only update maintenance tasks assigned to you.'
        });
      }
    }

    const beforeSnapshot = log.toObject();

    if (req.body.status !== undefined) log.status = req.body.status;
    if (req.body.notes !== undefined) log.notes = req.body.notes;
    if (req.body.cost !== undefined) log.cost = Number(req.body.cost);

    if (log.status === 'completed' && !log.completedDate) {
      log.completedDate = new Date();
    }

    await log.save();

    const diff = computeDiff(beforeSnapshot, log);

    await logAudit({
      user: req.user._id,
      action: 'update',
      entity: 'MaintenanceLog',
      entityId: log._id,
      summary: `Technician/User updated status/notes on maintenance task '${log.title}'`,
      changes: diff
    });

    const populatedLog = await MaintenanceLog.findById(log._id)
      .populate('asset', 'name assetTag category subcategory lifecycleStage status')
      .populate('technician', 'name email role');

    return sendSuccess(res, 'Maintenance task updated successfully', populatedLog);
  } catch (error) {
    next(error);
  }
};

/**
 * Start maintenance task
 * - Sets status to 'in_progress'
 * - Sets asset lifecycleStage to 'Under Maintenance' (only if currently 'In Service')
 * - Records a LifecycleEvent
 */
export const startMaintenance = async (req, res, next) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance log not found'
      });
    }

    // Technician permission check
    if (req.user.role === 'technician') {
      const assignedId = log.technician ? log.technician.toString() : null;
      if (assignedId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only start tasks assigned to you.'
        });
      }
    }

    log.status = 'in_progress';
    await log.save();

    // Fetch and check asset lifecycle
    const asset = await Asset.findById(log.asset);
    let assetTransitioned = false;

    if (asset && asset.lifecycleStage === 'In Service') {
      asset.lifecycleStage = 'Under Maintenance';
      await asset.save();
      assetTransitioned = true;

      await LifecycleEvent.create({
        asset: asset._id,
        fromStage: 'In Service',
        toStage: 'Under Maintenance',
        changedBy: req.user._id,
        remarks: `Maintenance started: ${log.title}`,
        date: new Date()
      });

      await logAudit({
        user: req.user._id,
        action: 'stage_change',
        entity: 'Asset',
        entityId: asset._id,
        summary: `Asset ${asset.assetTag} transitioned to 'Under Maintenance' via task '${log.title}'`
      });
    }

    await logAudit({
      user: req.user._id,
      action: 'update',
      entity: 'MaintenanceLog',
      entityId: log._id,
      summary: `Started maintenance task '${log.title}'`
    });

    const populatedLog = await MaintenanceLog.findById(log._id)
      .populate('asset', 'name assetTag category subcategory lifecycleStage status')
      .populate('technician', 'name email role');

    return sendSuccess(res, 'Maintenance task started successfully', {
      maintenance: populatedLog,
      assetStageTransitioned: assetTransitioned
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete maintenance task
 * - Sets status to 'completed', completedDate
 * - Updates cost/notes if provided
 * - Returns asset to 'In Service' if no other in-progress maintenance tasks remain
 * - Records a LifecycleEvent
 */
export const completeMaintenance = async (req, res, next) => {
  try {
    const { cost, notes } = req.body;

    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance log not found'
      });
    }

    // Technician permission check
    if (req.user.role === 'technician') {
      const assignedId = log.technician ? log.technician.toString() : null;
      if (assignedId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only complete tasks assigned to you.'
        });
      }
    }

    log.status = 'completed';
    log.completedDate = new Date();
    if (cost !== undefined && Number(cost) >= 0) log.cost = Number(cost);
    if (notes) log.notes = log.notes ? `${log.notes}\n${notes}` : notes;

    await log.save();

    // Check remaining in_progress maintenance for this asset
    const remainingInProgress = await MaintenanceLog.countDocuments({
      asset: log.asset,
      _id: { $ne: log._id },
      status: 'in_progress'
    });

    let assetReturnedToService = false;
    const asset = await Asset.findById(log.asset);

    if (remainingInProgress === 0 && asset && asset.lifecycleStage === 'Under Maintenance') {
      asset.lifecycleStage = 'In Service';
      await asset.save();
      assetReturnedToService = true;

      await LifecycleEvent.create({
        asset: asset._id,
        fromStage: 'Under Maintenance',
        toStage: 'In Service',
        changedBy: req.user._id,
        remarks: `Maintenance completed: ${log.title}`,
        date: new Date()
      });

      await logAudit({
        user: req.user._id,
        action: 'stage_change',
        entity: 'Asset',
        entityId: asset._id,
        summary: `Asset ${asset.assetTag} returned to 'In Service' following maintenance completion`
      });
    }

    await logAudit({
      user: req.user._id,
      action: 'update',
      entity: 'MaintenanceLog',
      entityId: log._id,
      summary: `Completed maintenance task '${log.title}'`
    });

    const populatedLog = await MaintenanceLog.findById(log._id)
      .populate('asset', 'name assetTag category subcategory lifecycleStage status')
      .populate('technician', 'name email role');

    return sendSuccess(res, 'Maintenance task completed successfully', {
      maintenance: populatedLog,
      assetReturnedToService
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete maintenance log (Admin, Manager)
 */
export const deleteMaintenanceLog = async (req, res, next) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance log not found'
      });
    }

    await MaintenanceLog.findByIdAndDelete(log._id);

    await logAudit({
      user: req.user._id,
      action: 'delete',
      entity: 'MaintenanceLog',
      entityId: log._id,
      summary: `Deleted maintenance log '${log.title}'`
    });

    return sendSuccess(res, 'Maintenance log deleted successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  getMaintenanceLogs,
  getMaintenanceLogById,
  createMaintenanceLog,
  updateMaintenanceLog,
  patchMaintenanceLog,
  startMaintenance,
  completeMaintenance,
  deleteMaintenanceLog
};
