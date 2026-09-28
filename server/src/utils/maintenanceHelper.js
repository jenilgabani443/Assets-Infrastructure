import MaintenanceLog from '../models/MaintenanceLog.js';

/**
 * Utility to identify all scheduled maintenance logs whose scheduledDate has passed
 * and transition their status to 'overdue'.
 * @returns {Promise<number>} - Count of records updated
 */
export const markOverdueMaintenance = async () => {
  try {
    const now = new Date();
    const result = await MaintenanceLog.updateMany(
      {
        status: 'scheduled',
        scheduledDate: { $lt: now }
      },
      {
        $set: { status: 'overdue' }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`⏱️  [Maintenance] Automatically marked ${result.modifiedCount} scheduled maintenance item(s) as overdue.`);
    }

    return result.modifiedCount;
  } catch (error) {
    console.error('⚠️  Failed to check and mark overdue maintenance logs:', error.message);
    return 0;
  }
};

export default {
  markOverdueMaintenance
};
