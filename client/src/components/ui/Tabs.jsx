import React from 'react';

export const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`border-b border-slate-200 ${className}`}>
      <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 transition-all ${
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Tabs;
