import React from 'react';
import { useToastStore, ToastMessage } from '../../store/toastStore';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#3F7D4A]" />,
    error: <AlertCircle className="w-5 h-5 text-[#D64545]" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#C77700]" />,
    info: <Info className="w-5 h-5 text-[#123F7A] dark:text-[#6EA8FE]" />,
  };

  const borders = {
    success: 'border-l-4 border-l-[#3F7D4A]',
    error: 'border-l-4 border-l-[#D64545]',
    warning: 'border-l-4 border-l-[#C77700]',
    info: 'border-l-4 border-l-[#123F7A]',
  };

  return (
    <div
      className={`pointer-events-auto bg-[#FFFFFF] dark:bg-[#18212B] border border-[#E1E5EA] dark:border-[#303B47] ${borders[toast.type]} rounded-lg shadow-lg p-3.5 flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-200`}
    >
      <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="text-xs font-semibold text-[#1F2937] dark:text-[#F3F4F6] mb-0.5">
            {toast.title}
          </h4>
        )}
        <p className="text-xs text-[#667085] dark:text-[#AAB4C0] break-words leading-relaxed">
          {toast.message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white p-0.5 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
