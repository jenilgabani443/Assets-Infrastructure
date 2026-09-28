import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      {children}
      {/* Toast Notification Container */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
              border: 'border-emerald-200',
              bg: 'bg-emerald-50/95 text-emerald-900',
              badge: 'bg-emerald-500',
            },
            error: {
              icon: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
              border: 'border-rose-200',
              bg: 'bg-rose-50/95 text-rose-900',
              badge: 'bg-rose-500',
            },
            warning: {
              icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
              border: 'border-amber-200',
              bg: 'bg-amber-50/95 text-amber-900',
              badge: 'bg-amber-500',
            },
            info: {
              icon: <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />,
              border: 'border-indigo-200',
              bg: 'bg-indigo-50/95 text-indigo-900',
              badge: 'bg-indigo-500',
            },
          }[toast.type] || {
            icon: <Info className="w-5 h-5 text-slate-600 flex-shrink-0" />,
            border: 'border-slate-200',
            bg: 'bg-white/95 text-slate-900',
            badge: 'bg-slate-500',
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 ${typeConfig.border} ${typeConfig.bg}`}
              role="alert"
            >
              {typeConfig.icon}
              <div className="flex-1 text-sm font-medium leading-snug break-words">
                {toast.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded focus:outline-none"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
