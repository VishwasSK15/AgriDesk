import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full select-none';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] leading-tight',
    md: 'px-2.5 py-1 text-xs leading-normal',
  };

  const variantStyles = {
    default: 'bg-[#F3F5F8] text-[#111827] dark:bg-[#202A35] dark:text-[#F9FAFB] border border-[#D1D5DB] dark:border-[#374151]',
    success: 'bg-[#EDF7EE] text-[#166534] dark:bg-[#142A19] dark:text-[#86EFAC] border border-[#166534]/30 dark:border-[#86EFAC]/30',
    warning: 'bg-[#FFF7ED] text-[#9A3412] dark:bg-[#32230B] dark:text-[#FDE68A] border border-[#9A3412]/30 dark:border-[#FDE68A]/30',
    danger: 'bg-[#FEF2F2] text-[#991B1B] dark:bg-[#2E1414] dark:text-[#FCA5A5] border border-[#991B1B]/30 dark:border-[#FCA5A5]/30',
    info: 'bg-[#EFF6FF] text-[#1E40AF] dark:bg-[#101D2E] dark:text-[#93C5FD] border border-[#1E40AF]/30 dark:border-[#93C5FD]/30',
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
