import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      isLoading = false,
      disabled = false,
      icon: Icon = null,
      iconPosition = 'left',
      prefixIcon: PrefixIcon = null,
      suffixIcon: SuffixIcon = null,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isSpinnerActive = Boolean(loading || isLoading);
    const LeftIcon = PrefixIcon || (iconPosition === 'left' ? Icon : null);
    const RightIcon = SuffixIcon || (iconPosition === 'right' ? Icon : null);

    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-xs hover:shadow-sm active:bg-primary-800',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400 border border-slate-200 shadow-2xs',
      outline:
        'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-primary-500 shadow-2xs',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-xs active:bg-rose-800',
      dangerOutline:
        'border border-rose-300 text-rose-600 bg-white hover:bg-rose-50 focus:ring-rose-500',
      ghost:
        'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400',
      link:
        'text-primary-600 hover:text-primary-800 underline-offset-4 hover:underline p-0 h-auto focus:ring-0',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5',
      md: 'text-sm px-3.5 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isSpinnerActive}
        className={`${baseStyles} ${variants[variant] || variants.primary} ${
          variant !== 'link' ? sizes[size] || sizes.md : ''
        } ${className}`}
        {...props}
      >
        {isSpinnerActive ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            {children && <span>{children}</span>}
          </>
        ) : (
          <>
            {LeftIcon && <LeftIcon className="w-4 h-4 flex-shrink-0" />}
            {children && <span>{children}</span>}
            {RightIcon && <RightIcon className="w-4 h-4 flex-shrink-0" />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
