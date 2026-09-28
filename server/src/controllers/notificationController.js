import { computeAlerts } from '../utils/alertHelper.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * Get real-time alerts for the in-app notification bell
 * Returns overdue maintenance, warranties expiring within 30 days,
 * and assets past expected lifespan, plus total alert count.
 */
export const getNotifications = async (req, res, next) => {
  try {
    const alerts = await computeAlerts();
    return sendSuccess(res, 'Notifications retrieved in real-time', alerts);
  } catch (error) {
    next(error);
  }
};

export default {
  getNotifications
};
