import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner = ({ size = 'md', className = '', fullScreen = false, label = 'Loading...' }) => {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  }[size] || 'w-6 h-6';

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses} animate-spin text-primary-600`} />
      {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Spinner;
