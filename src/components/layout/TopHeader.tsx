import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useThemeStore } from '../../store/themeStore';
import { Button } from '../common/Button';
import { Plus, Sun, Moon, LogOut, User as UserIcon, PauseCircle } from 'lucide-react';

interface Props {
  onNewBillClick: () => void;
  onOpenHeldBills: () => void;
}

export const TopHeader: React.FC<Props> = ({ onNewBillClick, onOpenHeldBills }) => {
  const { settings } = useSettingsStore();
  const { user, logout } = useAuthStore();
  const { heldBills } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const isDarkMode = theme === 'dark';

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-[#FFFFFF] dark:bg-[#18212B] border-b border-[#D1D5DB] dark:border-[#374151] px-6 flex items-center justify-between select-none">
      {/* Left: Shop Name */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight">
          {settings?.store_name || 'Annapurna Krishi Kendra'}
        </h2>
        {settings?.proprietor_name && (
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300 border-l border-gray-300 dark:border-gray-700 pl-3">
            Prop: {settings.proprietor_name}
          </span>
        )}
      </div>

      {/* Center: Realtime Date and Time */}
      <div className="text-xs text-gray-700 dark:text-slate-300 font-semibold hidden md:block">
        {currentTime}
      </div>

      {/* Right: Quick actions, Theme toggle, User badge */}
      <div className="flex items-center gap-3">
        {/* Held Bills Quick Indicator */}
        {heldBills.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenHeldBills}
            icon={<PauseCircle className="w-3.5 h-3.5 text-[#B45309]" />}
          >
            <span>Held Bills ({heldBills.length})</span>
            <kbd className="text-[10px] text-gray-600 dark:text-slate-300 font-semibold">F6</kbd>
          </Button>
        )}

        {/* New Bill Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onNewBillClick}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          <span>New Bill</span>
          <kbd className="text-[10px] bg-white/20 px-1 rounded font-bold">F1</kbd>
        </Button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="h-8 px-2.5 rounded-lg border border-[#D1D5DB] dark:border-[#374151] flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-[#18212B] hover:bg-[#F3F5F8] dark:hover:bg-[#202A35] transition-colors shadow-xs"
        >
          {isDarkMode ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-2 border-l border-[#D1D5DB] dark:border-[#374151] pl-3">
          <div className="flex items-center gap-1.5 text-xs text-[#111827] dark:text-[#F9FAFB]">
            <div className="w-7 h-7 rounded-full bg-[#123F7A]/10 text-[#123F7A] dark:bg-[#6EA8FE]/20 dark:text-[#6EA8FE] flex items-center justify-center font-bold">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="font-semibold text-xs leading-none text-[#111827] dark:text-[#F9FAFB]">{user?.name || 'User'}</p>
              <p className="text-[10px] text-gray-700 dark:text-slate-300 font-medium capitalize mt-0.5">{user?.role || 'staff'}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="w-7 h-7 rounded flex items-center justify-center text-gray-600 dark:text-slate-300 hover:text-[#DC2626] dark:hover:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-[#2E1414] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
