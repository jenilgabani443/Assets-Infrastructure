import React from 'react';

export const Card = ({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  className = '',
  bodyClassName = '',
  padding = true,
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-card transition-shadow duration-200 overflow-hidden ${className}`}
    >
      {(title || subtitle || headerAction) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-slate-800 leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className={`${padding ? 'p-5' : ''} ${bodyClassName}`}>
        {children}
      </div>
      {footer && (
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
