import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Package,
  Users,
  Truck,
  ShoppingCart,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useCartStore } from '../../store/cartStore';

export type NavItem =
  | 'dashboard'
  | 'billing'
  | 'invoices'
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'reports'
  | 'insights'
  | 'settings';

interface Props {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
}

export const Sidebar: React.FC<Props> = ({ currentTab, onSelectTab }) => {
  const { heldBills } = useCartStore();

  const navItems: { id: NavItem; label: string; icon: React.ReactNode; badge?: number; shortcut?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'billing', label: 'New Bill', icon: <Receipt className="w-4 h-4" />, shortcut: 'F1', badge: heldBills.length > 0 ? heldBills.length : undefined },
    { id: 'invoices', label: 'Bills / Invoices', icon: <FileText className="w-4 h-4" /> },
    { id: 'products', label: 'Products & Stock', icon: <Package className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'suppliers', label: 'Suppliers', icon: <Truck className="w-4 h-4" /> },
    { id: 'purchases', label: 'Purchases', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'insights', label: 'Insights Engine', icon: <Sparkles className="w-4 h-4 text-[#2D6A4F] dark:text-[#72B77E]" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-56 shrink-0 bg-[#FFFFFF] dark:bg-[#18212B] border-r border-[#D1D5DB] dark:border-[#374151] flex flex-col justify-between select-none h-screen">
      {/* Brand logo & title */}
      <div>
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-[#D1D5DB] dark:border-[#374151]">
          <div className="w-8 h-8 rounded-lg bg-[#123F7A] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            🌱
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] truncate tracking-tight">
              AgriStore POS
            </h1>
            <p className="text-[10px] text-gray-600 dark:text-slate-300 font-medium truncate">
              Retail & Inventory
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#123F7A]/10 text-[#123F7A] dark:bg-[#6EA8FE]/15 dark:text-[#6EA8FE]'
                    : 'text-gray-700 dark:text-slate-300 hover:text-gray-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#202A35]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={isActive ? 'text-[#123F7A] dark:text-[#6EA8FE]' : 'text-gray-600 dark:text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge !== undefined && (
                    <span className="bg-[#B45309] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.shortcut && (
                    <kbd className="px-1.5 py-0.5 text-[9px] bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded border border-gray-300 dark:border-slate-700 font-semibold">
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-[#D1D5DB] dark:border-[#374151] text-[11px] text-gray-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#2D6A4F] animate-pulse"></span>
          <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">Offline-First Active</span>
        </div>
        <p className="text-[10px] text-gray-600 dark:text-slate-300 font-medium mt-0.5">SQLite Local Engine</p>
      </div>
    </aside>
  );
};
