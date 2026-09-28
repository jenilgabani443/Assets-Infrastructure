import Asset from '../models/Asset.js';
import AssetCategory from '../models/AssetCategory.js';
import MaintenanceLog from '../models/MaintenanceLog.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { markOverdueMaintenance } from '../utils/maintenanceHelper.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * Get comprehensive analytics & dashboard stats
 * Uses aggregation pipelines for category breakdowns, metrics, and monthly costs
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    // Ensure overdue logs are up to date
    await markOverdueMaintenance();

    const now = new Date();

    // 1. Asset totals and total value
    const [assetTotalsAgg] = await Asset.aggregate([
      {
        $group: {
          _id: null,
          totalAssets: { $sum: 1 },
          totalValue: { $sum: '$cost' }
        }
      }
    ]);

    const totalAssets = assetTotalsAgg?.totalAssets || 0;
    const totalValue = assetTotalsAgg?.totalValue || 0;

    const [totalCategories, totalMaintenanceLogs] = await Promise.all([
      AssetCategory.countDocuments(),
      MaintenanceLog.countDocuments()
    ]);

    // 2. Count by Category with category name and icon
    const byCategory = await Asset.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: { $sum: '$cost' }
        }
      },
      {
        $lookup: {
          from: 'assetcategories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ['$category.name', 'Uncategorized'] },
          icon: { $ifNull: ['$category.icon', 'Box'] },
          count: 1,
          totalValue: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. Count by Lifecycle Stage
    const byLifecycleStage = await Asset.aggregate([
      {
        $group: {
          _id: '$lifecycleStage',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. Count by Status
    const byStatus = await Asset.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 5. Assets past or within 10% of expected lifespan
    const lifespanCandidates = await Asset.find({
      expectedLifespanYears: { $gt: 0 },
      $or: [{ installationDate: { $ne: null } }, { purchaseDate: { $ne: null } }]
    }).select('name assetTag installationDate purchaseDate expectedLifespanYears lifecycleStage department cost');

    const pastLifespan = [];
    const within10Percent = [];

    for (const asset of lifespanCandidates) {
      const startDate = asset.installationDate || asset.purchaseDate;
      const lifespanYears = asset.expectedLifespanYears;
      const lifespanMs = lifespanYears * 365.25 * 24 * 3600 * 1000;
      const ageMs = now.getTime() - new Date(startDate).getTime();
      const ratio = ageMs / lifespanMs;

      const summary = {
        _id: asset._id,
        assetTag: asset.assetTag,
        name: asset.name,
        department: asset.department,
        startDate,
        expectedLifespanYears: lifespanYears,
        lifecycleStage: asset.lifecycleStage,
        ratio: Math.round(ratio * 100) / 100
      };

      if (ratio >= 1.0) {
        pastLifespan.push(summary);
      } else if (ratio >= 0.9) {
        within10Percent.push(summary);
      }
    }

    // 6. Warranties expiring within 30 days
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);
    const warrantiesExpiringIn30Days = await Asset.find({
      warrantyExpiry: { $gte: now, $lte: in30Days }
    })
      .select('name assetTag warrantyExpiry department')
      .sort({ warrantyExpiry: 1 });

    // 7. Maintenance Metrics: Overdue, Upcoming 14 Days, and Cost by month (last 6 months)
    const in14Days = new Date();
    in14Days.setDate(now.getDate() + 14);

    const [overdueMaintenanceCount, upcomingMaintenance] = await Promise.all([
      MaintenanceLog.countDocuments({
        $or: [{ status: 'overdue' }, { status: 'scheduled', scheduledDate: { $lt: now } }]
      }),
      MaintenanceLog.find({
        scheduledDate: { $gte: now, $lte: in14Days },
        status: { $ne: 'completed' }
      })
        .populate('asset', 'name assetTag')
        .populate('technician', 'name email')
        .sort({ scheduledDate: 1 })
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const costByMonthAgg = await MaintenanceLog.aggregate([
      {
        $match: {
          $or: [
            { status: 'completed', completedDate: { $gte: sixMonthsAgo } },
            { createdAt: { $gte: sixMonthsAgo }, cost: { $gt: 0 } }
          ]
        }
      },
      {
        $group: {
          _id: {
            year: { $year: { $ifNull: ['$completedDate', '$createdAt'] } },
            month: { $month: { $ifNull: ['$completedDate', '$createdAt'] } }
          },
          totalCost: { $sum: '$cost' },
          taskCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format monthly maintenance chart data
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const costByMonth = costByMonthAgg.map((item) => ({
      year: item._id.year,
      month: item._id.month,
      monthName: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      totalCost: item.totalCost,
      taskCount: item.taskCount
    }));

    // 8. 10 most recent AuditLog activities
    const recentActivities = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('user', 'name email role');

    return sendSuccess(res, 'Dashboard statistics retrieved successfully', {
      totals: {
        totalAssets,
        totalValue,
        totalCategories,
        totalMaintenanceLogs
      },
      byCategory,
      byLifecycleStage: byLifecycleStage.map((s) => ({ stage: s._id, count: s.count })),
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
      lifespanAlerts: {
        pastLifespanCount: pastLifespan.length,
        within10PercentCount: within10Percent.length,
        pastLifespan,
        within10Percent
      },
      warrantiesExpiringWithin30Days: {
        count: warrantiesExpiringIn30Days.length,
        assets: warrantiesExpiringIn30Days
      },
      maintenance: {
        overdueCount: overdueMaintenanceCount,
        upcomingNext14DaysCount: upcomingMaintenance.length,
        upcomingNext14Days: upcomingMaintenance,
        costByMonthLast6Months: costByMonth
      },
      recentActivities
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getDashboardStats
};
