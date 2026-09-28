import Asset from '../models/Asset.js';
import AssetCategory from '../models/AssetCategory.js';
import MaintenanceLog from '../models/MaintenanceLog.js';
import { markOverdueMaintenance } from './maintenanceHelper.js';

/**
 * Computes real-time system alerts:
 * 1. Overdue maintenance tasks
 * 2. Assets with warranty expiring within 30 days
 * 3. Assets that have exceeded their expected lifespan
 */
export const computeAlerts = async () => {
  // 1. Mark overdue tasks first
  await markOverdueMaintenance();

  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(now.getDate() + 30);

  // 1. Overdue maintenance
  const overdueMaintenance = await MaintenanceLog.find({
    $or: [{ status: 'overdue' }, { status: 'scheduled', scheduledDate: { $lt: now } }]
  })
    .populate('asset', 'name assetTag category subcategory department')
    .populate('technician', 'name email')
    .sort({ scheduledDate: 1 });

  // 2. Warranties expiring within 30 days
  const expiringWarranties = await Asset.find({
    status: { $ne: 'retired' },
    warrantyExpiry: { $gte: now, $lte: in30Days }
  })
    .populate('category', 'name icon')
    .select('name assetTag category department warrantyExpiry cost')
    .sort({ warrantyExpiry: 1 });

  // 3. Assets past lifespan
  const lifespanCandidates = await Asset.find({
    status: { $ne: 'retired' },
    expectedLifespanYears: { $gt: 0 },
    $or: [{ installationDate: { $ne: null } }, { purchaseDate: { $ne: null } }]
  })
    .populate('category', 'name icon')
    .select('name assetTag category department installationDate purchaseDate expectedLifespanYears lifecycleStage cost');

  const pastLifespanAssets = [];

  for (const asset of lifespanCandidates) {
    const startDate = asset.installationDate || asset.purchaseDate;
    const lifespanYears = asset.expectedLifespanYears;
    const lifespanMs = lifespanYears * 365.25 * 24 * 3600 * 1000;
    const ageMs = now.getTime() - new Date(startDate).getTime();
    const ratio = ageMs / lifespanMs;

    if (ratio >= 1.0) {
      pastLifespanAssets.push({
        _id: asset._id,
        assetTag: asset.assetTag,
        name: asset.name,
        category: asset.category,
        department: asset.department,
        lifecycleStage: asset.lifecycleStage,
        startDate,
        expectedLifespanYears: lifespanYears,
        exceededYears: Math.round(((ageMs - lifespanMs) / (365.25 * 24 * 3600 * 1000)) * 10) / 10
      });
    }
  }

  const total = overdueMaintenance.length + expiringWarranties.length + pastLifespanAssets.length;

  return {
    total,
    overdueMaintenance,
    expiringWarranties,
    pastLifespanAssets
  };
};

export default {
  computeAlerts
};
