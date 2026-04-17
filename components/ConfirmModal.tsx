'use client';

import React from 'react';
import { AlertTriangle, LogOut, X, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  variant = 'info',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger': return <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4"><AlertTriangle size={28} /></div>;
      case 'warning': return <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4"><LogOut size={28} /></div>;
      default: return <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4"><Info size={28} /></div>;
    }
  };

  const getConfirmBtnClass = () => {
    switch (variant) {
      case 'danger': return 'bg-red-600 hover:bg-red-700 text-white shadow-red-200';
      case 'warning': return 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100';
      default: return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl shadow-slate-900/20 border border-slate-100 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-1 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          {getIcon()}
          
          <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
            {title}
          </h3>
          
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            {message}
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-3.5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-3.5 rounded-2xl font-bold transition-all active:scale-95 shadow-lg flex items-center justify-center ${getConfirmBtnClass()}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
