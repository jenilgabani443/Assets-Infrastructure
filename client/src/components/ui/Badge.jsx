import React from 'react';
import { LIFECYCLE_STAGE_META, STATUS_META, MAINTENANCE_STATUS_META } from '../../utils/constants';

export const Badge = ({
  children,
  variant = 'slate',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variants = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const sizes = {
    sm: 'text-2xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${
        variants[variant] || variants.slate
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-current opacity-80"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

/**
 * Dedicated Badge for Lifecycle stages:
 * Planned (gray), Procured (purple), Installed (blue),
 * In Service (green), Under Maintenance (amber), Decommissioned (red)
 */
export const LifecycleBadge = ({ stage, size = 'md', className = '' }) => {
  const meta = LIFECYCLE_STAGE_META[stage] || {
    label: stage || 'Unknown',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const sizes = {
    sm: 'text-2xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${meta.bg} ${meta.text} ${meta.border} ${sizes[size] || sizes.md} ${className}`}
      title={meta.description}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
};

/**
 * Dedicated Badge for Operational Status (active, inactive, retired)
 */
export const StatusBadge = ({ status, size = 'md', className = '' }) => {
  const meta = STATUS_META[status?.toLowerCase()] || {
    label: status || 'Unknown',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const sizes = {
    sm: 'text-2xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${meta.bg} ${meta.text} ${meta.border} ${sizes[size] || sizes.md} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      <span className="capitalize">{meta.label}</span>
    </span>
  );
};

/**
 * Dedicated Badge for Maintenance Status (scheduled, in_progress, completed, overdue)
 */
export const MaintenanceStatusBadge = ({ status, size = 'md', className = '' }) => {
  const meta = MAINTENANCE_STATUS_META[status?.toLowerCase()] || {
    label: status || 'Unknown',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const sizes = {
    sm: 'text-2xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${meta.bg} ${meta.text} ${meta.border} ${sizes[size] || sizes.md} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
};

export default Badge;
