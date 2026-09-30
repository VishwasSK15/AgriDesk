import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-gray-500 dark:text-slate-400 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full bg-[#FFFFFF] dark:bg-[#18212B] text-[#111827] dark:text-[#F9FAFB] border rounded-lg h-10 px-3 text-sm transition-colors
            placeholder:text-gray-500 dark:placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-[#123F7A]/30 focus:border-[#123F7A] dark:focus:ring-[#6EA8FE]/30 dark:focus:border-[#6EA8FE]
            disabled:bg-[#F3F5F8] dark:disabled:bg-[#202A35] disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-9' : ''}
            ${rightIcon ? 'pr-9' : ''}
            ${error ? 'border-[#DC2626] dark:border-[#F87171] focus:border-[#DC2626] focus:ring-[#DC2626]/20' : 'border-[#D1D5DB] dark:border-[#374151]'}
            ${className}`}
          type={type}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-gray-500 dark:text-slate-400 flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-[#DC2626] dark:text-[#F87171] font-semibold">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-700 dark:text-slate-300 font-medium">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
