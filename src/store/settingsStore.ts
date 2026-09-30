import { create } from 'zustand';
import { StoreSettings } from '../types';

interface SettingsState {
  settings: StoreSettings | null;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (data: Partial<StoreSettings>) => Promise<boolean>;
}

export const defaultSettings: StoreSettings = {
  id: 1,
  store_name: 'Annapurna Krishi Kendra',
  tagline: 'Fertilizers, Pesticides & Hybrid Seeds',
  proprietor_name: 'Suresh Patil',
  address: 'Main Road, APMC Yard, Mandya, Karnataka - 571401',
  mobile: '9876543210',
  email: 'annapurna.krishi@gmail.com',
  gstin: '29AAAAA0000A1Z5',
  dl_number_1: 'KA-MY-P12345',
  dl_number_2: 'KA-MY-F67890',
  state: 'Karnataka',
  state_code: '29',
  bank_name: 'State Bank of India',
  account_number: '30123456789',
  ifsc_code: 'SBIN0001234',
  upi_id: 'annapurna@sbi',
  invoice_prefix: 'INV-',
  default_printer: 'Default Printer',
  default_print_format: 'thermal_80',
  auto_print_on_sale: true,
  terms_and_conditions: '1. Goods once sold will not be accepted back without original bill.\n2. Keep seeds and agrochemicals away from children.\n3. Subject to Mandya jurisdiction.',
  low_stock_threshold_default: 10,
  expiry_alert_days: 60,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    if (window.electronAPI) {
      try {
        set({ isLoading: true });
        const res = await window.electronAPI.getSettings();
        if (res) {
          set({ settings: res, isLoading: false });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        set({ isLoading: false });
      }
    }
  },

  updateSettings: async (data: Partial<StoreSettings>) => {
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.updateSettings({ data });
        if (res.success && res.settings) {
          set({ settings: res.settings });
          return true;
        }
      } catch (err) {
        console.error('Failed to update settings:', err);
      }
    } else {
      set((state) => ({
        settings: state.settings ? { ...state.settings, ...data } : null,
      }));
      return true;
    }
    return false;
  },
}));
