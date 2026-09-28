import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      options = [],
      placeholder,
      id,
      className = '',
      required = false,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-2xs">
          <select
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`block w-full appearance-none rounded-lg border text-sm text-slate-900 bg-white pl-3.5 pr-10 py-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
              error
                ? 'border-rose-300 focus:ring-rose-500 text-rose-900 bg-rose-50/20'
                : 'border-slate-300 focus:ring-primary-500 hover:border-slate-400'
            } ${className}`}
            {...props}
          >
            {children ? (
              <>
                {placeholder && (
                  <option value="" disabled={required}>
                    {placeholder}
                  </option>
                )}
                {children}
              </>
            ) : (
              <>
                {placeholder !== false && (
                  <option value="" disabled={required}>
                    {placeholder || 'Select an option'}
                  </option>
                )}
                {options.map((opt) => {
                  const value = typeof opt === 'object' ? opt.value : opt;
                  const labelText = typeof opt === 'object' ? opt.label : opt;
                  return (
                    <option key={value} value={value}>
                      {labelText}
                    </option>
                  );
                })}
              </>
            )}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
