'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast container in the top middle */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={[
              'pointer-events-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-slide-down cursor-pointer select-none',
              toast.type === 'success'
                ? 'bg-emerald-950/75 border-emerald-500/30 text-emerald-300 shadow-emerald-950/20'
                : toast.type === 'error'
                ? 'bg-red-950/75 border-red-500/30 text-red-300 shadow-red-950/20'
                : 'bg-[#121220]/80 border-white/10 text-white/90 shadow-black/40',
            ].join(' ')}
          >
            <div className="flex items-center gap-2.5 text-sm font-medium">
              {toast.type === 'success' && <span className="text-base">✨</span>}
              {toast.type === 'error' && <span className="text-base">🚨</span>}
              {toast.type === 'info' && <span className="text-base">ℹ️</span>}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="text-white/30 hover:text-white/60 transition-colors p-0.5 rounded"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
