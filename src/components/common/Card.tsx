import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = '',
  noPadding = false,
}) => {
  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl overflow-hidden shadow-xs ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-[#D1D5DB] dark:border-[#374151] flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-gray-700 dark:text-slate-300 font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`${noPadding ? '' : 'p-5'} ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};
