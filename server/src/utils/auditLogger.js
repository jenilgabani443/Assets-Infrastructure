import AuditLog from '../models/AuditLog.js';

/**
 * Computes difference between two objects, ignoring system fields
 * @param {Object} oldObj - Object before modification
 * @param {Object} newObj - Object after modification
 * @param {Array<string>} ignoredFields - Field keys to skip
 * @returns {Object|null} - { before: {...}, after: {...} } or null if no diff
 */
export const computeDiff = (
  oldObj = {},
  newObj = {},
  ignoredFields = ['_id', '__v', 'createdAt', 'updatedAt', 'password']
) => {
  const beforeDiff = {};
  const afterDiff = {};

  const cleanOld = oldObj?.toObject ? oldObj.toObject() : { ...oldObj };
  const cleanNew = newObj?.toObject ? newObj.toObject() : { ...newObj };

  // Collect all keys from both objects
  const allKeys = new Set([...Object.keys(cleanOld), ...Object.keys(cleanNew)]);

  for (const key of allKeys) {
    if (ignoredFields.includes(key)) continue;

    const oldVal = cleanOld[key];
    const newVal = cleanNew[key];

    // Deep compare via JSON representation
    const oldStr = JSON.stringify(oldVal === undefined ? null : oldVal);
    const newStr = JSON.stringify(newVal === undefined ? null : newVal);

    if (oldStr !== newStr) {
      beforeDiff[key] = oldVal;
      afterDiff[key] = newVal;
    }
  }

  if (Object.keys(beforeDiff).length === 0 && Object.keys(afterDiff).length === 0) {
    return null;
  }

  return {
    before: beforeDiff,
    after: afterDiff
  };
};

/**
 * Reusable helper to record audit logs
 * @param {Object} params
 * @param {string|ObjectId} params.user - User ID who triggered the action
 * @param {'create'|'update'|'delete'|'stage_change'|'login'} params.action
 * @param {string} params.entity - e.g. 'Asset', 'AssetCategory', 'User'
 * @param {string|ObjectId} params.entityId
 * @param {string} params.summary
 * @param {Object} [params.changes] - Before/after diff or metadata
 */
export const logAudit = async ({
  user = null,
  action,
  entity,
  entityId = null,
  summary,
  changes = null
}) => {
  try {
    const auditRecord = await AuditLog.create({
      user: user || null,
      action,
      entity,
      entityId,
      summary,
      changes,
      timestamp: new Date()
    });
    return auditRecord;
  } catch (error) {
    console.error('⚠️  Failed to record audit log:', error.message);
    return null;
  }
};

export default {
  computeDiff,
  logAudit
};
