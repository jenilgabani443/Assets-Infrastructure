import QRCode from 'qrcode';
import Asset from '../models/Asset.js';
import AssetCategory from '../models/AssetCategory.js';
import AuditLog from '../models/AuditLog.js';
import LifecycleEvent from '../models/LifecycleEvent.js';
import { computeDiff, logAudit } from '../utils/auditLogger.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Validates dynamic customFields against a category's fieldDefinitions
 * Returns array of field-level errors: [{ field, message }]
 */
export const validateCustomFields = (customFields = {}, fieldDefinitions = []) => {
  const errors = [];
  const fields = customFields || {};

  for (const def of fieldDefinitions) {
    const value = fields[def.key];
    const fieldPath = `customFields.${def.key}`;

    // 1. Required check
    if (def.required) {
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        errors.push({
          field: fieldPath,
          message: `${def.label} is required`
        });
        continue;
      }
    }

    // If value not provided and not required, skip type validation
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      continue;
    }

    // 2. Type checks
    switch (def.type) {
      case 'number': {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({
            field: fieldPath,
            message: `${def.label} must be a valid number`
          });
        }
        break;
      }
      case 'date': {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push({
            field: fieldPath,
            message: `${def.label} must be a valid ISO date`
          });
        }
        break;
      }
      case 'boolean': {
        const isBool =
          typeof value === 'boolean' || value === 'true' || value === 'false' || value === true || value === false;
        if (!isBool) {
          errors.push({
            field: fieldPath,
            message: `${def.label} must be true or false`
          });
        }
        break;
      }
      case 'select': {
        if (!def.options.includes(value)) {
          errors.push({
            field: fieldPath,
            message: `${def.label} must be one of: ${def.options.join(', ')}`
          });
        }
        break;
      }
      case 'text':
      default: {
        if (typeof value !== 'string') {
          errors.push({
            field: fieldPath,
            message: `${def.label} must be text`
          });
        }
        break;
      }
    }
  }

  return errors;
};

/**
 * List assets with multi-parameter search, filtering, sorting, and pagination
 */
export const getAssets = async (req, res, next) => {
  try {
    const {
      search,
      category,
      lifecycleStage,
      status,
      department,
      warrantyExpiringInDays,
      endOfLife,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    // 1. Text search on name, assetTag, subcategory
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { assetTag: searchRegex },
        { subcategory: searchRegex }
      ];
    }

    // 2. Category filter
    if (category) {
      query.category = category;
    }

    // 3. Lifecycle stage filter
    if (lifecycleStage) {
      query.lifecycleStage = lifecycleStage;
    }

    // 4. Status filter
    if (status) {
      query.status = status;
    }

    // 5. Department filter
    if (department) {
      query.department = department;
    }

    // 6. Warranty expiring in X days filter
    if (warrantyExpiringInDays) {
      const days = parseInt(warrantyExpiringInDays, 10);
      if (!isNaN(days) && days >= 0) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);
        query.warrantyExpiry = {
          $gte: now,
          $lte: futureDate
        };
      }
    }

    // 7. End of life filter (installationDate + expectedLifespanYears <= now)
    if (endOfLife === 'true' || endOfLife === true) {
      query.installationDate = { $ne: null };
      query.expectedLifespanYears = { $ne: null, $gt: 0 };
      query.$expr = {
        $lte: [
          {
            $dateAdd: {
              startDate: '$installationDate',
              unit: 'year',
              amount: '$expectedLifespanYears'
            }
          },
          new Date()
        ]
      };
    }

    // Sort parsing
    let sortOption = {};
    if (typeof sort === 'string') {
      if (sort.includes(':')) {
        const [field, order] = sort.split(':');
        sortOption[field] = order.toLowerCase() === 'desc' ? -1 : 1;
      } else {
        sortOption = sort;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .populate('category', 'name icon description')
        .populate('createdBy', 'name email role')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Asset.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      data: assets,
      total,
      page: pageNum,
      pages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get distinct departments
 */
export const getDistinctDepartments = async (req, res, next) => {
  try {
    const departments = await Asset.distinct('department', {
      department: { $exists: true, $ne: '' }
    });
    return sendSuccess(res, 'Distinct departments retrieved', departments.filter(Boolean).sort());
  } catch (error) {
    next(error);
  }
};

/**
 * Get single asset by ID (All roles)
 */
export const getAssetById = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('category', 'name icon description fieldDefinitions')
      .populate('createdBy', 'name email role');

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    return sendSuccess(res, 'Asset retrieved successfully', asset);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new asset (Admin, Manager)
 * - Auto-generates assetTag
 * - Validates dynamic customFields against category
 * - Creates initial LifecycleEvent
 * - Logs audit
 */
export const createAsset = async (req, res, next) => {
  try {
    const {
      name,
      category: categoryId,
      subcategory,
      status,
      lifecycleStage = 'Planned',
      location,
      purchaseDate,
      installationDate,
      cost,
      expectedLifespanYears,
      warrantyExpiry,
      department,
      imageUrl,
      customFields = {}
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'name', message: 'Asset name is required' }]
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'category', message: 'Asset category is required' }]
      });
    }

    // Verify category exists
    const categoryDoc = await AssetCategory.findById(categoryId);
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'category', message: 'Specified category does not exist' }]
      });
    }

    // Validate dynamic customFields against category's fieldDefinitions
    const customFieldErrors = validateCustomFields(
      customFields,
      categoryDoc.fieldDefinitions || []
    );
    if (customFieldErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed in customFields',
        errors: customFieldErrors
      });
    }

    // Create asset (pre-save hook generates AST-0001 tag)
    const asset = new Asset({
      name: name.trim(),
      category: categoryDoc._id,
      subcategory: subcategory?.trim() || '',
      status: status || 'active',
      lifecycleStage,
      location: location || { address: '', lat: null, lng: null },
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      installationDate: installationDate ? new Date(installationDate) : null,
      cost: cost !== undefined ? Number(cost) : 0,
      expectedLifespanYears: expectedLifespanYears ? Number(expectedLifespanYears) : null,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
      department: department?.trim() || '',
      imageUrl: imageUrl?.trim() || '',
      customFields,
      createdBy: req.user._id
    });

    await asset.save();

    // Create initial LifecycleEvent
    await LifecycleEvent.create({
      asset: asset._id,
      fromStage: null,
      toStage: asset.lifecycleStage,
      changedBy: req.user._id,
      remarks: 'Initial asset cataloging',
      date: new Date()
    });

    // Record AuditLog
    await logAudit({
      user: req.user._id,
      action: 'create',
      entity: 'Asset',
      entityId: asset._id,
      summary: `Created asset ${asset.assetTag} (${asset.name}) in stage '${asset.lifecycleStage}'`
    });

    const populatedAsset = await Asset.findById(asset._id)
      .populate('category', 'name icon description')
      .populate('createdBy', 'name email role');

    return sendSuccess(res, 'Asset created successfully', populatedAsset, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update asset (Admin, Manager)
 * - Rejects direct lifecycleStage changes
 * - Validates customFields if category or customFields change
 * - Logs audit with before/after diff
 */
export const updateAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Reject direct lifecycle stage changes
    if (req.body.lifecycleStage && req.body.lifecycleStage !== asset.lifecycleStage) {
      return res.status(400).json({
        success: false,
        message:
          'Direct modification of lifecycleStage is not permitted via update. Use the stage transition endpoint /api/assets/:id/stage.'
      });
    }

    // Immutable assetTag check
    if (req.body.assetTag && req.body.assetTag !== asset.assetTag) {
      return res.status(400).json({
        success: false,
        message: 'Modification of auto-generated assetTag is not permitted.'
      });
    }

    const targetCategoryId = req.body.category || asset.category;
    const categoryDoc = await AssetCategory.findById(targetCategoryId);
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'category', message: 'Target category does not exist' }]
      });
    }

    // If customFields or category updated, validate customFields
    const fieldsToValidate =
      req.body.customFields !== undefined ? req.body.customFields : asset.customFields;
    const customFieldErrors = validateCustomFields(
      fieldsToValidate,
      categoryDoc.fieldDefinitions || []
    );
    if (customFieldErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed in customFields',
        errors: customFieldErrors
      });
    }

    const beforeSnapshot = asset.toObject();

    const updatableFields = [
      'name',
      'category',
      'subcategory',
      'status',
      'location',
      'purchaseDate',
      'installationDate',
      'cost',
      'expectedLifespanYears',
      'warrantyExpiry',
      'department',
      'imageUrl',
      'customFields'
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        asset[field] = req.body[field];
      }
    }

    await asset.save();

    const diff = computeDiff(beforeSnapshot, asset);

    await logAudit({
      user: req.user._id,
      action: 'update',
      entity: 'Asset',
      entityId: asset._id,
      summary: `Updated asset ${asset.assetTag} (${asset.name})`,
      changes: diff
    });

    const updatedAsset = await Asset.findById(asset._id)
      .populate('category', 'name icon description')
      .populate('createdBy', 'name email role');

    return sendSuccess(res, 'Asset updated successfully', updatedAsset);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete asset (Admin only)
 */
export const deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    await Asset.findByIdAndDelete(asset._id);

    await logAudit({
      user: req.user._id,
      action: 'delete',
      entity: 'Asset',
      entityId: asset._id,
      summary: `Deleted asset ${asset.assetTag} (${asset.name})`
    });

    return sendSuccess(res, `Asset ${asset.assetTag} deleted successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate QR code for asset
 * Returns PNG data URL encoding {CLIENT_URL}/assets/:id
 */
export const getAssetQrCode = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    const targetUrl = `${CLIENT_URL}/assets/${asset._id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 2,
      width: 300,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });

    return sendSuccess(res, 'Asset QR code generated successfully', {
      targetUrl,
      qrCode: qrCodeDataUrl,
      asset: {
        _id: asset._id,
        assetTag: asset.assetTag,
        name: asset.name
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit history for a specific asset
 */
export const getAssetAuditHistory = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    const auditLogs = await AuditLog.find({
      entity: 'Asset',
      entityId: asset._id
    })
      .sort({ timestamp: -1 })
      .populate('user', 'name email role');

    return sendSuccess(res, 'Asset audit trail retrieved', auditLogs);
  } catch (error) {
    next(error);
  }
};

import MaintenanceLog from '../models/MaintenanceLog.js';
import { ALLOWED_STAGE_TRANSITIONS } from '../models/Asset.js';

/**
 * Transition asset lifecycle stage (Admin, Manager)
 * - Enforces allowed state transitions
 * - Automatically populates installationDate on 'Installed' if blank
 * - Creates a LifecycleEvent
 * - Logs audit 'stage_change'
 */
export const transitionLifecycleStage = async (req, res, next) => {
  try {
    const { toStage, remarks } = req.body;

    if (!toStage) {
      return res.status(400).json({
        success: false,
        message: 'Destination lifecycle stage (toStage) is required'
      });
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    const fromStage = asset.lifecycleStage;

    // Validate allowed transition
    const allowedNextStages = ALLOWED_STAGE_TRANSITIONS[fromStage] || [];
    if (!allowedNextStages.includes(toStage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid lifecycle stage transition from '${fromStage}' to '${toStage}'.`,
        allowedNextStages
      });
    }

    // Setting Installed sets installationDate if currently empty
    if (toStage === 'Installed' && !asset.installationDate) {
      asset.installationDate = new Date();
    }

    // Setting Decommissioned retires the asset status
    if (toStage === 'Decommissioned') {
      asset.status = 'retired';
    }

    asset.lifecycleStage = toStage;
    await asset.save();

    // Create LifecycleEvent
    await LifecycleEvent.create({
      asset: asset._id,
      fromStage,
      toStage,
      changedBy: req.user._id,
      remarks: remarks || '',
      date: new Date()
    });

    // Record stage_change audit log
    await logAudit({
      user: req.user._id,
      action: 'stage_change',
      entity: 'Asset',
      entityId: asset._id,
      summary: `Transitioned asset ${asset.assetTag} from '${fromStage}' to '${toStage}'`,
      changes: {
        before: { lifecycleStage: fromStage },
        after: { lifecycleStage: toStage }
      }
    });

    const updatedAsset = await Asset.findById(asset._id)
      .populate('category', 'name icon description')
      .populate('createdBy', 'name email role');

    return sendSuccess(
      res,
      `Asset lifecycle stage successfully transitioned to '${toStage}'`,
      updatedAsset
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get merged chronological asset history timeline (lifecycle events + maintenance logs)
 */
export const getAssetTimeline = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    const [lifecycleEvents, maintenanceLogs] = await Promise.all([
      LifecycleEvent.find({ asset: asset._id })
        .populate('changedBy', 'name email role')
        .sort({ date: -1 }),
      MaintenanceLog.find({ asset: asset._id })
        .populate('technician', 'name email role')
        .sort({ scheduledDate: -1 })
    ]);

    const timelineItems = [
      ...lifecycleEvents.map((event) => ({
        _id: event._id,
        kind: 'lifecycle',
        title: `Lifecycle: ${event.fromStage || 'Initial'} → ${event.toStage}`,
        fromStage: event.fromStage,
        toStage: event.toStage,
        remarks: event.remarks,
        user: event.changedBy,
        date: event.date || event.createdAt,
        createdAt: event.createdAt
      })),
      ...maintenanceLogs.map((log) => ({
        _id: log._id,
        kind: 'maintenance',
        title: `Maintenance: ${log.title}`,
        type: log.type,
        status: log.status,
        cost: log.cost,
        notes: log.notes,
        technician: log.technician,
        scheduledDate: log.scheduledDate,
        completedDate: log.completedDate,
        date: log.completedDate || log.scheduledDate || log.createdAt,
        createdAt: log.createdAt
      }))
    ];

    // Sort merged timeline descending by date
    timelineItems.sort((a, b) => new Date(b.date) - new Date(a.date));

    return sendSuccess(res, 'Asset timeline retrieved', timelineItems);
  } catch (error) {
    next(error);
  }
};

/**
 * Export assets to CSV with flattened custom fields
 */
export const exportAssetsCsv = async (req, res, next) => {
  try {
    const {
      search,
      category,
      lifecycleStage,
      status,
      department,
      warrantyExpiringInDays,
      endOfLife
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { assetTag: searchRegex },
        { subcategory: searchRegex }
      ];
    }
    if (category) query.category = category;
    if (lifecycleStage) query.lifecycleStage = lifecycleStage;
    if (status) query.status = status;
    if (department) query.department = department;

    if (warrantyExpiringInDays) {
      const days = parseInt(warrantyExpiringInDays, 10);
      if (!isNaN(days) && days >= 0) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);
        query.warrantyExpiry = { $gte: now, $lte: futureDate };
      }
    }

    if (endOfLife === 'true' || endOfLife === true) {
      query.installationDate = { $ne: null };
      query.expectedLifespanYears = { $ne: null, $gt: 0 };
      query.$expr = {
        $lte: [
          {
            $dateAdd: {
              startDate: '$installationDate',
              unit: 'year',
              amount: '$expectedLifespanYears'
            }
          },
          new Date()
        ]
      };
    }

    const assets = await Asset.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Collect all dynamic custom field keys across matching assets
    const customFieldKeysSet = new Set();
    assets.forEach((a) => {
      if (a.customFields && typeof a.customFields === 'object') {
        Object.keys(a.customFields).forEach((k) => customFieldKeysSet.add(k));
      }
    });
    const customFieldKeys = Array.from(customFieldKeysSet).sort();

    // Escape CSV cell helper
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      if (val instanceof Date) str = val.toISOString();
      return `"${str.replace(/"/g, '""')}"`;
    };

    const staticHeaders = [
      'Asset Tag',
      'Name',
      'Category',
      'Subcategory',
      'Status',
      'Lifecycle Stage',
      'Department',
      'Cost',
      'Expected Lifespan (Years)',
      'Installation Date',
      'Purchase Date',
      'Warranty Expiry',
      'Address',
      'Latitude',
      'Longitude',
      'Created At'
    ];

    const dynamicHeaders = customFieldKeys.map((k) => `cf_${k}`);
    const csvHeaderRow = [...staticHeaders, ...dynamicHeaders].map(escapeCsv).join(',');

    const csvRows = assets.map((a) => {
      const row = [
        escapeCsv(a.assetTag),
        escapeCsv(a.name),
        escapeCsv(a.category?.name || ''),
        escapeCsv(a.subcategory),
        escapeCsv(a.status),
        escapeCsv(a.lifecycleStage),
        escapeCsv(a.department),
        escapeCsv(a.cost),
        escapeCsv(a.expectedLifespanYears),
        escapeCsv(a.installationDate),
        escapeCsv(a.purchaseDate),
        escapeCsv(a.warrantyExpiry),
        escapeCsv(a.location?.address || ''),
        escapeCsv(a.location?.lat),
        escapeCsv(a.location?.lng),
        escapeCsv(a.createdAt)
      ];

      for (const cfKey of customFieldKeys) {
        const val = a.customFields?.[cfKey];
        row.push(escapeCsv(val));
      }

      return row.join(',');
    });

    const csvContent = [csvHeaderRow, ...csvRows].join('\n');
    const filename = `assets-export-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Import assets from JSON array with category validation and dryRun support
 */
export const importAssets = async (req, res, next) => {
  try {
    const rawRows = Array.isArray(req.body) ? req.body : req.body.rows || [];
    const dryRun = req.body.dryRun === true || req.query.dryRun === 'true';

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body must contain an array of asset rows'
      });
    }

    // Cache categories by ID and by lowercase Name
    const categories = await AssetCategory.find();
    const catMapById = new Map();
    const catMapByName = new Map();

    categories.forEach((cat) => {
      catMapById.set(cat._id.toString(), cat);
      catMapByName.set(cat.name.trim().toLowerCase(), cat);
    });

    const validRows = [];
    const failedRows = [];

    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];
      const rowNum = index + 1;
      const errors = [];

      if (!row.name || !String(row.name).trim()) {
        errors.push({ field: 'name', message: 'Asset name is required' });
      }

      // Resolve category by ID or by Name
      let targetCat = null;
      if (row.category) {
        const catStr = String(row.category).trim();
        targetCat = catMapById.get(catStr) || catMapByName.get(catStr.toLowerCase());
      }

      if (!targetCat) {
        errors.push({
          field: 'category',
          message: `Category '${row.category}' could not be resolved to an existing category`
        });
      } else {
        // Validate customFields against resolved category definitions
        const customFieldErrors = validateCustomFields(
          row.customFields || {},
          targetCat.fieldDefinitions || []
        );
        errors.push(...customFieldErrors);
      }

      if (errors.length > 0) {
        failedRows.push({ row: rowNum, data: row, errors });
      } else {
        validRows.push({
          name: String(row.name).trim(),
          category: targetCat._id,
          subcategory: row.subcategory?.trim() || '',
          status: row.status || 'active',
          lifecycleStage: row.lifecycleStage || 'Planned',
          location: row.location || { address: row.address || '', lat: row.lat, lng: row.lng },
          purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
          installationDate: row.installationDate ? new Date(row.installationDate) : null,
          cost: Number(row.cost) >= 0 ? Number(row.cost) : 0,
          expectedLifespanYears:
            Number(row.expectedLifespanYears) >= 0 ? Number(row.expectedLifespanYears) : null,
          warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
          department: row.department?.trim() || '',
          imageUrl: row.imageUrl?.trim() || '',
          customFields: row.customFields || {},
          createdBy: req.user._id
        });
      }
    }

    if (dryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        total: rawRows.length,
        validCount: validRows.length,
        invalidCount: failedRows.length,
        failed: failedRows
      });
    }

    // Not dry run: save valid rows
    const createdAssets = [];
    for (const validData of validRows) {
      const asset = new Asset(validData);
      await asset.save();

      await LifecycleEvent.create({
        asset: asset._id,
        fromStage: null,
        toStage: asset.lifecycleStage,
        changedBy: req.user._id,
        remarks: 'Batch CSV/JSON import',
        date: new Date()
      });

      createdAssets.push(asset);
    }

    await logAudit({
      user: req.user._id,
      action: 'create',
      entity: 'Asset',
      summary: `Batch imported ${createdAssets.length} assets (${failedRows.length} failed)`
    });

    return res.status(201).json({
      success: true,
      dryRun: false,
      total: rawRows.length,
      created: createdAssets.length,
      failedCount: failedRows.length,
      failed: failedRows
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetQrCode,
  getDistinctDepartments,
  getAssetAuditHistory,
  validateCustomFields,
  transitionLifecycleStage,
  getAssetTimeline,
  exportAssetsCsv,
  importAssets
};
