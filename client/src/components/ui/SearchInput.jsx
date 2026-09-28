import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchInput = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="block w-full pl-9 pr-8 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
