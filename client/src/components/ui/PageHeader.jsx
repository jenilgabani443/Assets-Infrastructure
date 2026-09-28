import React from 'react';

export const PageHeader = ({
  title,
  description,
  breadcrumbs = [],
  actions = null,
  className = '',
}) => {
  return (
    <div
      className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div>
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.label || idx}>
                {idx > 0 && <span className="text-slate-300">/</span>}
                {crumb.to ? (
                  <a
                    href={crumb.to}
                    className="hover:text-primary-600 transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-slate-700 font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 leading-snug">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
};

export default PageHeader;
