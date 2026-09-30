import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useCartStore } from './store/cartStore';
import { Sidebar, NavItem } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { ToastContainer } from './components/common/ToastContainer';
import { Modal } from './components/common/Modal';
import { Button } from './components/common/Button';
import { Input } from './components/common/Input';
import { toast } from './store/toastStore';

// Pages
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { BillingPage } from './pages/Billing/BillingPage';
import { InvoicesPage } from './pages/Invoices/InvoicesPage';
import { ProductsPage } from './pages/Products/ProductsPage';
import { CustomersPage } from './pages/Customers/CustomersPage';
import { SuppliersPage } from './pages/Suppliers/SuppliersPage';
import { PurchasesPage } from './pages/Purchases/PurchasesPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { InsightsPage } from './pages/Insights/InsightsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

import { Play, Trash2, Lock, User as UserIcon } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading, initializeAuth, login } = useAuthStore();
  const { settings, loadSettings } = useSettingsStore();
  const { heldBills, restoreHeldBill, deleteHeldBill } = useCartStore();

  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);

  // Login form states
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    initializeAuth();
    loadSettings();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentTab('billing');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setIsHeldModalOpen(true);
      } else if (e.key === 'F5') {
        // Prevent accidental browser/Electron reload
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const res = await login(loginUsername, loginPassword);
    setIsLoggingIn(false);
    if (!res.success) {
      toast.error(res.error || 'Login failed');
    } else {
      toast.success('Signed in successfully');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F6F7F9] dark:bg-[#10151C]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#123F7A] text-white flex items-center justify-center font-bold text-lg animate-pulse">
            🌱
          </div>
          <p className="text-xs font-semibold text-gray-500">Starting AgriStore POS Engine...</p>
        </div>
      </div>
    );
  }

  // Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F6F7F9] dark:bg-[#10151C] p-4 select-none">
        <div className="w-full max-w-sm bg-white dark:bg-[#18212B] border border-[#E1E5EA] dark:border-[#303B47] rounded-2xl p-7 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#123F7A] text-white flex items-center justify-center font-bold text-xl shadow-xs">
              🌱
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1F2937] dark:text-[#F3F4F6] tracking-tight">
                AgriStore Billing
              </h1>
              <p className="text-xs text-gray-500">Offline Counter Sign-In</p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <Input
              label="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="admin or staff"
              leftIcon={<UserIcon className="w-4 h-4 text-gray-400" />}
              required
            />
            <Input
              label="Password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4 text-gray-400" />}
              required
            />
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isLoggingIn}
              className="w-full h-11 text-sm font-semibold mt-2"
            >
              Sign In to Counter
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] text-center text-gray-400">
            Default credentials: <strong className="text-gray-600 dark:text-gray-300">admin / admin123</strong>
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-[#F6F7F9] dark:bg-[#10151C] overflow-hidden">
      {/* Fixed Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <TopHeader
          onNewBillClick={() => setCurrentTab('billing')}
          onOpenHeldBills={() => setIsHeldModalOpen(true)}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1400px] mx-auto pb-12">
            {currentTab === 'dashboard' && (
              <DashboardPage onNavigate={(tab) => setCurrentTab(tab)} settings={settings!} />
            )}
            {currentTab === 'billing' && (
              <BillingPage
                settings={settings!}
                onNavigateToInvoices={() => setCurrentTab('invoices')}
              />
            )}
            {currentTab === 'invoices' && <InvoicesPage settings={settings!} />}
            {currentTab === 'products' && <ProductsPage />}
            {currentTab === 'customers' && <CustomersPage />}
            {currentTab === 'suppliers' && <SuppliersPage />}
            {currentTab === 'purchases' && <PurchasesPage />}
            {currentTab === 'reports' && <ReportsPage />}
            {currentTab === 'insights' && <InsightsPage onNavigate={(tab) => setCurrentTab(tab)} />}
            {currentTab === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>

      {/* Held Bills Global Modal */}
      {isHeldModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsHeldModalOpen(false)}
          title="Held Counter Bills"
          subtitle="Resume checkout for a paused customer transaction"
          maxWidth="lg"
        >
          {heldBills.length > 0 ? (
            <div className="space-y-3 text-xs">
              {heldBills.map((hb) => (
                <div
                  key={hb.id}
                  className="p-3.5 border border-[#E1E5EA] dark:border-[#303B47] rounded-xl flex items-center justify-between bg-white dark:bg-[#18212B]"
                >
                  <div>
                    <span className="font-bold text-sm text-[#1F2937] dark:text-[#F3F4F6]">
                      {hb.customer?.name || 'Walk-in Customer'}
                    </span>
                    <p className="text-gray-500 mt-0.5">
                      {hb.items.length} item(s) • Total: <strong>₹{hb.totalAmount.toFixed(2)}</strong> (Held at {hb.heldAt})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        restoreHeldBill(hb.id);
                        setIsHeldModalOpen(false);
                        setCurrentTab('billing');
                        toast.success('Bill resumed on counter');
                      }}
                      icon={<Play className="w-3.5 h-3.5" />}
                    >
                      Resume
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteHeldBill(hb.id)}
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Discard
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              No bills currently held.
            </div>
          )}
        </Modal>
      )}

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
