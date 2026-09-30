import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    text?: string;
  };
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  iconBg = 'bg-[#123F7A]/10 text-[#123F7A] dark:bg-[#6EA8FE]/15 dark:text-[#6EA8FE]',
  trend,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl p-4.5 flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-[#123F7A]/50 hover:shadow-xs' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>

      <div className="mt-2.5">
        <div className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            {trend && (
              <span className={`font-bold ${trend.isPositive ? 'text-[#166534] dark:text-[#86EFAC]' : 'text-[#991B1B] dark:text-[#FCA5A5]'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
            {subtitle && (
              <span className="text-gray-700 dark:text-slate-300 font-medium truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
