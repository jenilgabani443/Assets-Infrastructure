/**
 * Formats a numeric value into Indian Rupee (INR) currency representation
 * e.g., 1450000 -> ₹14,50,000
 * @param {number|string} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0';
  }
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Formats an ISO date or Date instance into readable localized format
 * e.g., 2026-09-28 -> Sep 28, 2026
 * @param {string|Date} dateVal
 * @param {object} options
 * @returns {string}
 */
export const formatDate = (dateVal, options = {}) => {
  if (!dateVal) return '—';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return '—';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(date);
};

/**
 * Formats an ISO date or Date instance into date and time
 * e.g., Sep 28, 2026, 02:30 PM
 * @param {string|Date} dateVal
 * @returns {string}
 */
export const formatDateTime = (dateVal) => {
  if (!dateVal) return '—';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Returns human-friendly relative time (e.g. "3 days ago", "in 12 days")
 * @param {string|Date} dateVal
 * @returns {string}
 */
export const formatRelativeTime = (dateVal) => {
  if (!dateVal) return '—';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
};
