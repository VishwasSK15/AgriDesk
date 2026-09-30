import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  options,
  className = '',
  disabled,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        disabled={disabled}
        className={`w-full bg-[#FFFFFF] dark:bg-[#18212B] text-[#111827] dark:text-[#F9FAFB] border rounded-lg h-10 px-3 text-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#123F7A]/30 focus:border-[#123F7A] dark:focus:ring-[#6EA8FE]/30 dark:focus:border-[#6EA8FE]
          disabled:bg-[#F3F5F8] dark:disabled:bg-[#202A35] disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? 'border-[#DC2626] dark:border-[#F87171] focus:border-[#DC2626] focus:ring-[#DC2626]/20' : 'border-[#D1D5DB] dark:border-[#374151]'}
          ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#18212B] text-slate-900 dark:text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-[#DC2626] dark:text-[#F87171] font-semibold">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-700 dark:text-slate-300 font-medium">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
