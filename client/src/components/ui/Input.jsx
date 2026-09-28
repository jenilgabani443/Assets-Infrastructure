import React from 'react';

export const Input = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      prefixIcon: PrefixIcon = null,
      suffixIcon: SuffixIcon = null,
      id,
      className = '',
      required = false,
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
        <div className="relative rounded-lg shadow-2xs">
          {PrefixIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <PrefixIcon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`block w-full rounded-lg border text-sm text-slate-900 placeholder-slate-400 bg-white transition-all duration-150 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
              PrefixIcon ? 'pl-9' : 'pl-3.5'
            } ${SuffixIcon ? 'pr-9' : 'pr-3.5'} py-2 ${
              error
                ? 'border-rose-300 focus:ring-rose-500 text-rose-900 bg-rose-50/20'
                : 'border-slate-300 focus:ring-primary-500 hover:border-slate-400'
            } ${className}`}
            {...props}
          />
          {SuffixIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <SuffixIcon className="w-4 h-4" />
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
