import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'agri' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5 h-8',
    md: 'px-4 py-2 text-sm gap-2 h-10',
    lg: 'px-5 py-2.5 text-base gap-2.5 h-12',
  };

  const variantStyles = {
    primary: 'bg-[#123F7A] text-white hover:bg-[#0E3263] focus:ring-[#123F7A] dark:bg-[#1A4F96] dark:hover:bg-[#123F7A]',
    secondary: 'bg-[#F3F5F8] text-[#1F2937] hover:bg-[#E5E9EF] border border-[#E1E5EA] focus:ring-slate-300 dark:bg-[#202A35] dark:text-[#F3F4F6] dark:border-[#303B47] dark:hover:bg-[#2A3746]',
    agri: 'bg-[#3F7D4A] text-white hover:bg-[#34673D] focus:ring-[#3F7D4A] dark:bg-[#488B54] dark:hover:bg-[#3F7D4A]',
    danger: 'bg-[#D64545] text-white hover:bg-[#B93838] focus:ring-[#D64545]',
    outline: 'border border-[#E1E5EA] text-[#1F2937] hover:bg-[#F3F5F8] focus:ring-slate-300 dark:border-[#303B47] dark:text-[#F3F4F6] dark:hover:bg-[#202A35]',
    ghost: 'text-[#667085] hover:text-[#1F2937] hover:bg-[#F3F5F8] dark:text-[#AAB4C0] dark:hover:text-[#F3F4F6] dark:hover:bg-[#202A35]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};
