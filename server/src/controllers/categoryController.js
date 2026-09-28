import AssetCategory from '../models/AssetCategory.js';
import Asset from '../models/Asset.js';
import { computeDiff, logAudit } from '../utils/auditLogger.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const VALID_FIELD_TYPES = ['text', 'number', 'date', 'select', 'boolean'];

/**
 * Validate fieldDefinitions structure:
 * - unique keys
 * - valid types: text, number, date, select, boolean
 * - select requires non-empty options array
 */
export const validateFieldDefinitions = (fieldDefinitions = []) => {
  const errors = [];
  const seenKeys = new Set();

  if (!Array.isArray(fieldDefinitions)) {
    return [{ field: 'fieldDefinitions', message: 'fieldDefinitions must be an array' }];
  }

  fieldDefinitions.forEach((field, index) => {
    const prefix = `fieldDefinitions[${index}]`;

    if (!field.key || typeof field.key !== 'string' || !field.key.trim()) {
      errors.push({ field: `${prefix}.key`, message: 'Field key is required' });
    } else {
      const normalizedKey = field.key.trim().toLowerCase();
      if (seenKeys.has(normalizedKey)) {
        errors.push({
          field: `${prefix}.key`,
          message: `Duplicate field key '${field.key}' detected`
        });
      } else {
        seenKeys.add(normalizedKey);
      }
    }

    if (!field.label || typeof field.label !== 'string' || !field.label.trim()) {
      errors.push({ field: `${prefix}.label`, message: 'Field label is required' });
    }

    if (!field.type || !VALID_FIELD_TYPES.includes(field.type)) {
      errors.push({
        field: `${prefix}.type`,
        message: `Field type must be one of: ${VALID_FIELD_TYPES.join(', ')}`
      });
    }

    if (field.type === 'select') {
      const validOptions = Array.isArray(field.options)
        ? field.options.filter((opt) => typeof opt === 'string' && opt.trim().length > 0)
        : [];
      if (validOptions.length === 0) {
        errors.push({
          field: `${prefix}.options`,
          message: "Field type 'select' requires at least one non-empty option string"
        });
      }
    }
  });

  return errors;
};

/**
 * Get all asset categories (Authenticated - any role)
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await AssetCategory.find().sort({ name: 1 });
    return sendSuccess(res, 'Categories retrieved successfully', categories);
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by ID (Authenticated - any role)
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const category = await AssetCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    return sendSuccess(res, 'Category retrieved successfully', category);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new category (Admin, Manager)
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description = '', icon = 'Box', fieldDefinitions = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'name', message: 'Category name is required' }]
      });
    }

    // Check duplicate name
    const existing = await AssetCategory.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A category named '${name.trim()}' already exists.`
      });
    }

    // Validate fieldDefinitions
    if (fieldDefinitions.length > 0) {
      const fieldErrors = validateFieldDefinitions(fieldDefinitions);
      if (fieldErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed in fieldDefinitions',
          errors: fieldErrors
        });
      }
    }

    const category = await AssetCategory.create({
      name: name.trim(),
      description: description.trim(),
      icon: icon.trim() || 'Box',
      fieldDefinitions
    });

    await logAudit({
      user: req.user._id,
      action: 'create',
      entity: 'AssetCategory',
      entityId: category._id,
      summary: `Created asset category '${category.name}'`
    });

    return sendSuccess(res, 'Category created successfully', category, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update category by ID (Admin, Manager)
 */
export const updateCategory = async (req, res, next) => {
  try {
    const category = await AssetCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const { name, description, icon, fieldDefinitions } = req.body;

    // Check name uniqueness if updated
    if (name && name.trim() !== category.name) {
      const existing = await AssetCategory.findOne({ name: name.trim() });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `A category named '${name.trim()}' already exists.`
        });
      }
    }

    // Validate fieldDefinitions if provided
    if (fieldDefinitions !== undefined) {
      const fieldErrors = validateFieldDefinitions(fieldDefinitions);
      if (fieldErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed in fieldDefinitions',
          errors: fieldErrors
        });
      }
    }

    const beforeSnapshot = category.toObject();

    if (name !== undefined) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (icon !== undefined) category.icon = icon.trim();
    if (fieldDefinitions !== undefined) category.fieldDefinitions = fieldDefinitions;

    await category.save();

    const diff = computeDiff(beforeSnapshot, category);

    await logAudit({
      user: req.user._id,
      action: 'update',
      entity: 'AssetCategory',
      entityId: category._id,
      summary: `Updated asset category '${category.name}'`,
      changes: diff
    });

    return sendSuccess(res, 'Category updated successfully', category);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category by ID (Admin only, blocked if assets use it)
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await AssetCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if any assets are associated with this category
    const assetCount = await Asset.countDocuments({ category: category._id });
    if (assetCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${assetCount} asset(s) are currently assigned to '${category.name}'. Reassign or delete those assets first.`
      });
    }

    await AssetCategory.findByIdAndDelete(category._id);

    await logAudit({
      user: req.user._id,
      action: 'delete',
      entity: 'AssetCategory',
      entityId: category._id,
      summary: `Deleted asset category '${category.name}'`
    });

    return sendSuccess(res, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  validateFieldDefinitions
};
