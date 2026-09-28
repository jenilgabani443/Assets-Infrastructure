import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon = null,
  colorScheme = 'indigo', // indigo, emerald, amber, rose, blue, purple, slate
  trend = null, // { text: '+12%', isPositive: true }
  onClick = null,
  className = '',
}) => {
  const schemeStyles = {
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      badge: 'text-indigo-700 bg-indigo-50',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      badge: 'text-emerald-700 bg-emerald-50',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      badge: 'text-amber-700 bg-amber-50',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      badge: 'text-rose-700 bg-rose-50',
    },
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      badge: 'text-blue-700 bg-blue-50',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
      badge: 'text-purple-700 bg-purple-50',
    },
    slate: {
      iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
      badge: 'text-slate-700 bg-slate-100',
    },
  }[colorScheme] || {
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    badge: 'text-indigo-700 bg-indigo-50',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-card transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
            {title}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  trend.isPositive
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-rose-700 bg-rose-50'
                }`}
              >
                {trend.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={`p-3 rounded-xl border flex-shrink-0 ${schemeStyles.iconBg}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
