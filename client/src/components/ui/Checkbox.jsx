import React from 'react';

export const Checkbox = React.forwardRef(
  (
    {
      label,
      description,
      id,
      className = '',
      disabled = false,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <div className="flex items-center h-5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="text-sm leading-tight">
            {label && (
              <label
                htmlFor={inputId}
                className="font-medium text-slate-800 cursor-pointer select-none"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
