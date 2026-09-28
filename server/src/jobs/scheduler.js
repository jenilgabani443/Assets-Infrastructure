import cron from 'node-cron';
import User from '../models/User.js';
import { computeAlerts } from '../utils/alertHelper.js';
import { sendEmail, isSmtpConfigured } from '../services/emailService.js';

/**
 * Executes daily digest task:
 * 1. Checks and marks overdue maintenance
 * 2. Computes alert counts (overdue maintenance, expiring warranties, assets past lifespan)
 * 3. Sends digest email to active administrators and managers (if SMTP configured)
 */
export const runDailyDigestJob = async () => {
  console.log('⏰ [Scheduler] Executing Infrastructure Asset Inventory Daily Digest Job...');

  try {
    const alerts = await computeAlerts();

    console.log(`📊 [Scheduler Alert Summary] Overdue Maintenance: ${alerts.overdueMaintenance.length}, Expiring Warranties: ${alerts.expiringWarranties.length}, Past Lifespan: ${alerts.pastLifespanAssets.length}`);

    // If no alerts, nothing urgent to email
    if (alerts.total === 0) {
      console.log('✅ [Scheduler] No active alerts found. System is in prime health.');
      return alerts;
    }

    // Check if SMTP is configured
    if (!isSmtpConfigured()) {
      console.log('ℹ️  [Scheduler] SMTP credentials missing or placeholder. Skipping email dispatch (alerts computed in real-time).');
      return alerts;
    }

    // Fetch active admins and managers
    const recipients = await User.find({
      role: { $in: ['admin', 'manager'] },
      isActive: true
    }).select('email name');

    if (recipients.length === 0) {
      console.log('ℹ️  [Scheduler] No active admins or managers found to email.');
      return alerts;
    }

    const emailList = recipients.map((r) => r.email).join(', ');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
          Infrastructure Asset Inventory - Daily Health Digest
        </h2>
        <p>Hello Team,</p>
        <p>Here is your daily infrastructure operational digest for <strong>${new Date().toLocaleDateString()}</strong>.</p>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #334155;">Active Alerts Overview (${alerts.total} total)</h3>
          <ul style="line-height: 1.8;">
            <li><strong>Overdue Maintenance Tasks:</strong> <span style="color: #ef4444;">${alerts.overdueMaintenance.length}</span></li>
            <li><strong>Warranties Expiring (Next 30 Days):</strong> <span style="color: #f59e0b;">${alerts.expiringWarranties.length}</span></li>
            <li><strong>Assets Exceeding Expected Lifespan:</strong> <span style="color: #6366f1;">${alerts.pastLifespanAssets.length}</span></li>
          </ul>
        </div>

        ${
          alerts.overdueMaintenance.length > 0
            ? `
          <h4 style="color: #dc2626; margin-bottom: 6px;">Top Overdue Maintenance Tasks</h4>
          <ul>
            ${alerts.overdueMaintenance
              .slice(0, 5)
              .map(
                (m) =>
                  `<li><strong>${m.title}</strong> (Asset: ${m.asset?.assetTag || 'N/A'}) - Due: ${new Date(m.scheduledDate).toLocaleDateString()}</li>`
              )
              .join('')}
          </ul>
        `
            : ''
        }

        <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
          Please log in to the Infrastructure Asset Inventory dashboard to review and dispatch technicians.
        </p>
      </div>
    `;

    await sendEmail({
      to: emailList,
      subject: `🚨 Daily Digest: ${alerts.total} Infrastructure Alerts Require Attention`,
      html: htmlBody,
      text: `Daily Infrastructure Digest: ${alerts.overdueMaintenance.length} overdue tasks, ${alerts.expiringWarranties.length} expiring warranties, ${alerts.pastLifespanAssets.length} assets past lifespan.`
    });

    return alerts;
  } catch (error) {
    console.error('❌ [Scheduler Error] Exception during daily digest job:', error.message);
  }
};

/**
 * Initialize cron schedule: runs daily at 08:00 AM (0 8 * * *)
 */
export const initScheduler = () => {
  // Daily at 08:00 AM
  const task = cron.schedule('0 8 * * *', async () => {
    await runDailyDigestJob();
  });

  console.log('⏰ [Scheduler] Node-cron initialized: Daily digest scheduled for 08:00 AM.');
  return task;
};

export default {
  initScheduler,
  runDailyDigestJob
};
