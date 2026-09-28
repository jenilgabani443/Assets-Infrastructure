import React from 'react';

export const Textarea = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      id,
      className = '',
      required = false,
      rows = 3,
      disabled = false,
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
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          disabled={disabled}
          className={`block w-full rounded-lg border text-sm text-slate-900 placeholder-slate-400 bg-white px-3.5 py-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-300 focus:ring-rose-500 text-rose-900 bg-rose-50/20'
              : 'border-slate-300 focus:ring-primary-500 hover:border-slate-400'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
