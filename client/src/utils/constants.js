export const LIFECYCLE_STAGES = [
  'Planned',
  'Procured',
  'Installed',
  'In Service',
  'Under Maintenance',
  'Decommissioned',
];

export const ALLOWED_STAGE_TRANSITIONS = {
  Planned: ['Procured'],
  Procured: ['Installed'],
  Installed: ['In Service'],
  'In Service': ['Under Maintenance', 'Decommissioned'],
  'Under Maintenance': ['In Service', 'Decommissioned'],
  Decommissioned: [],
};

/**
 * Semantic theme styling for lifecycle stages:
 * - Planned: gray / slate
 * - Procured: purple / violet
 * - Installed: blue / sky
 * - In Service: green / emerald
 * - Under Maintenance: amber / yellow
 * - Decommissioned: red / rose
 */
export const LIFECYCLE_STAGE_META = {
  Planned: {
    label: 'Planned',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
    hex: '#64748b',
    description: 'Project approved, awaiting procurement & funding',
  },
  Procured: {
    label: 'Procured',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    hex: '#8b5cf6',
    description: 'Purchase order completed, awaiting site delivery & installation',
  },
  Installed: {
    label: 'Installed',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    hex: '#3b82f6',
    description: 'Physically placed on-site, undergoing final safety verification',
  },
  'In Service': {
    label: 'In Service',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    hex: '#10b981',
    description: 'Fully operational and delivering public municipal services',
  },
  'Under Maintenance': {
    label: 'Under Maintenance',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    hex: '#f59e0b',
    description: 'Active repair, overhaul, or scheduled diagnostics in progress',
  },
  Decommissioned: {
    label: 'Decommissioned',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    hex: '#ef4444',
    description: 'End of life reached, permanently taken out of service',
  },
};

export const STATUS_META = {
  active: {
    label: 'Active',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  inactive: {
    label: 'Inactive',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
  },
  retired: {
    label: 'Retired',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

export const MAINTENANCE_STATUS_META = {
  scheduled: {
    label: 'Scheduled',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  overdue: {
    label: 'Overdue',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

export const MAINTENANCE_TYPE_META = {
  preventive: { label: 'Preventive', icon: 'ShieldCheck', color: 'text-blue-600' },
  corrective: { label: 'Corrective', icon: 'Wrench', color: 'text-amber-600' },
  inspection: { label: 'Inspection', icon: 'ClipboardCheck', color: 'text-purple-600' },
};

/**
 * Role Permission Helpers
 */
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TECHNICIAN: 'technician',
};

export const canManageUsers = (role) => role === ROLES.ADMIN;
export const canManageCategories = (role) => [ROLES.ADMIN, ROLES.MANAGER].includes(role);
export const canCreateAssets = (role) => [ROLES.ADMIN, ROLES.MANAGER].includes(role);
export const canEditAssets = (role) => [ROLES.ADMIN, ROLES.MANAGER].includes(role);
export const canDeleteAssets = (role) => role === ROLES.ADMIN;
export const canChangeLifecycle = (role) => [ROLES.ADMIN, ROLES.MANAGER].includes(role);
export const canScheduleMaintenance = (role) => [ROLES.ADMIN, ROLES.MANAGER].includes(role);
export const canExecuteMaintenance = (role) => [ROLES.ADMIN, ROLES.MANAGER, ROLES.TECHNICIAN].includes(role);
