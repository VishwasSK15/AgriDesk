import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initializeAuth: async () => {
    try {
      const stored = localStorage.getItem('agristore_user');
      if (stored) {
        const user = JSON.parse(stored);
        set({ user, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {
      // ignore
    }
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  login: async (username: string, password: string) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.login({ username, password });
      if (res.success && res.user) {
        localStorage.setItem('agristore_user', JSON.stringify(res.user));
        set({ user: res.user, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: res.error || 'Login failed' };
    }
    // Fallback if running directly
    if (username === 'admin' && password === 'admin123') {
      const adminUser: User = { id: 1, username: 'admin', name: 'Store Admin', role: 'admin', created_at: new Date().toISOString() };
      set({ user: adminUser, isAuthenticated: true });
      return { success: true };
    }
    return { success: false, error: 'Invalid credentials' };
  },

  logout: () => {
    localStorage.removeItem('agristore_user');
    set({ user: null, isAuthenticated: false });
  },
}));
