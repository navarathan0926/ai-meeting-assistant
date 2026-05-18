'use client';

import React, { useEffect } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in"
        onClick={isConfirming ? undefined : onCancel}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-[#0d0d15] border border-white/10 rounded-2xl p-6 shadow-2xl animate-slide-down z-10">
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isConfirming}
          className="absolute top-4 right-4 text-white/40 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Warning Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white/95 leading-6">
              {title}
            </h3>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isConfirming}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 border border-white/10 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
            className="flex items-center justify-center gap-2 min-w-[80px] px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 border border-red-500/10 rounded-xl shadow-lg shadow-red-950/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isConfirming ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
