import React, { useState, useEffect } from 'react';
import { StoreSettings, PrintFormat, User, UserRole, AuditLog } from '../../types';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { toast } from '../../store/toastStore';
import {
  Settings as SettingsIcon,
  Printer,
  Database,
  Users,
  ShieldCheck,
  Save,
  Download,
  Upload,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'store' | 'printer' | 'appearance' | 'backup' | 'users'>('store');
  const [formData, setFormData] = useState<Partial<StoreSettings>>({});
  const [printers, setPrinters] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Backup states
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // New user state
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  useEffect(() => {
    fetchPrintersAndLogs();
  }, [activeTab]);

  const fetchPrintersAndLogs = async () => {
    if (window.electronAPI) {
      try {
        const prs = await window.electronAPI.getPrinters();
        setPrinters(prs || []);

        const logs = await window.electronAPI.getAuditLogs(50);
        setAuditLogs(logs || []);

        const users = await window.electronAPI.getUsers();
        setUsersList(users || []);
      } catch (err) {
        console.error('Failed to load system details:', err);
      }
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateSettings(formData);
    if (success) {
      toast.success('Store configuration saved successfully!');
    } else {
      toast.error('Failed to save settings');
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.createBackup();
        if (res.success && res.filePath) {
          toast.success(`Backup created: ${res.filePath}`);
          fetchPrintersAndLogs();
        } else {
          toast.error(res.error || 'Backup creation failed');
        }
      } else {
        toast.info('Local SQLite backup is managed by the Electron desktop environment.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Backup failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!window.electronAPI) return;

    const filePath = await window.electronAPI.openBackupFileDialog();
    if (!filePath) return;

    const confirmRestore = confirm(
      `WARNING: Restoring from '${filePath}' will replace the current store database with the backup copy.\nDo you want to proceed?`
    );
    if (!confirmRestore) return;

    setIsRestoring(true);
    try {
      const res = await window.electronAPI.restoreBackup(filePath);
      if (res.success) {
        toast.success('Database restored successfully! Application will reload.');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(res.error || 'Failed to restore database');
      }
    } catch (err: any) {
      toast.error(err.message || 'Restore error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newName) {
      toast.warning('All fields are required');
      return;
    }

    if (window.electronAPI) {
      const res = await window.electronAPI.createUser({
        username: newUsername,
        name: newName,
        role: newRole,
        password: newPassword,
      });

      if (res.success) {
        toast.success(`User '${newUsername}' created`);
        setIsNewUserModalOpen(false);
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        fetchPrintersAndLogs();
      } else {
        toast.error(res.error || 'Failed to create user');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Settings Navigation Tabs */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#E1E5EA] dark:border-[#303B47] rounded-xl p-3.5 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'store'
              ? 'bg-[#123F7A] text-white dark:bg-[#6EA8FE] dark:text-slate-900 shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:bg-[#F3F5F8] dark:hover:bg-[#202A35]'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          Store Profile & Tax
        </button>

        <button
          onClick={() => setActiveTab('printer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'printer'
              ? 'bg-[#123F7A] text-white dark:bg-[#6EA8FE] dark:text-slate-900 shadow-xs'
              : 'text-gray-700 dark:text-slate-300 hover:bg-[#F3F5F8] dark:hover:bg-[#202A35]'
          }`}
        >
          <Printer className="w-4 h-4" />
          Mandatory Printer Configuration
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'appearance'
              ? 'bg-[#123F7A] text-white dark:bg-[#6EA8FE] dark:text-slate-900 shadow-xs'
              : 'text-gray-700 dark:text-slate-300 hover:bg-[#F3F5F8] dark:hover:bg-[#202A35]'
          }`}
        >
          {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          Appearance & Theme
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'backup'
              ? 'bg-[#123F7A] text-white dark:bg-[#6EA8FE] dark:text-slate-900 shadow-xs'
              : 'text-gray-700 dark:text-slate-300 hover:bg-[#F3F5F8] dark:hover:bg-[#202A35]'
          }`}
        >
          <Database className="w-4 h-4" />
          Backup & Audit Trail
        </button>

        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-[#123F7A] text-white dark:bg-[#6EA8FE] dark:text-slate-900 shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-[#F3F5F8] dark:hover:bg-[#202A35]'
            }`}
          >
            <Users className="w-4 h-4" />
            User Access & Roles
          </button>
        )}
      </div>

      {/* TAB 1: STORE PROFILE */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveStore} className="space-y-4">
          <Card
            title="Store Identification & Agricultural Retail Licenses"
            subtitle="Details printed on tax invoices, cash memos, and thermal receipts"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <Input
                label="Store Name *"
                value={formData.store_name || ''}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                required
              />
              <Input
                label="Tagline / Business Nature"
                value={formData.tagline || ''}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
              <Input
                label="Proprietor / Owner Name"
                value={formData.proprietor_name || ''}
                onChange={(e) => setFormData({ ...formData, proprietor_name: e.target.value })}
              />
              <Input
                label="Contact Mobile *"
                value={formData.mobile || ''}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                required
              />
              <div className="md:col-span-2">
                <Input
                  label="Full Shop Address *"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Store GSTIN *"
                value={formData.gstin || ''}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="State"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
                <Input
                  label="State Code"
                  value={formData.state_code || ''}
                  onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                />
              </div>
              <Input
                label="Pesticide Dealer License Number"
                value={formData.dl_number_1 || ''}
                onChange={(e) => setFormData({ ...formData, dl_number_1: e.target.value })}
                placeholder="e.g. KA-MY-P12345"
              />
              <Input
                label="Fertilizer Dealer License Number"
                value={formData.dl_number_2 || ''}
                onChange={(e) => setFormData({ ...formData, dl_number_2: e.target.value })}
                placeholder="e.g. KA-MY-F67890"
              />
            </div>
          </Card>

          <Card title="Banking Details & Invoice Format" subtitle="For RTGS / NEFT and UPI QR payments">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <Input
                label="Bank Name"
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
              <Input
                label="Account Number"
                value={formData.account_number || ''}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              />
              <Input
                label="Bank IFSC Code"
                value={formData.ifsc_code || ''}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
              />
              <Input
                label="Store UPI ID"
                value={formData.upi_id || ''}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                placeholder="username@bank"
              />
              <Input
                label="Invoice Prefix"
                value={formData.invoice_prefix || ''}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                placeholder="INV-"
              />
              <div>
                <label className="block text-xs font-semibold mb-1.5">Terms and Conditions</label>
                <textarea
                  rows={3}
                  value={formData.terms_and_conditions || ''}
                  onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B] text-xs"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button variant="primary" size="md" type="submit" icon={<Save className="w-4 h-4" />}>
              Save Store Profile
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: MANDATORY PRINTER CONFIGURATION */}
      {activeTab === 'printer' && (
        <div className="space-y-4">
          <Card
            title="Printer & Mandatory Receipt Workflow"
            subtitle="Configure physical counter printers for 58mm/80mm thermal receipts or A4 GST tax invoices"
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Default Hardware Printer</label>
                  <select
                    value={formData.default_printer || ''}
                    onChange={(e) => setFormData({ ...formData, default_printer: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B] text-xs font-medium"
                  >
                    <option value="">Native Windows Print Dialog (Ctrl+P / Recommended)</option>
                    <option value="Default Printer">Windows Default Printer (Direct Spool)</option>
                    {printers.map((pr, i) => (
                      <option key={i} value={pr.name}>
                        Direct Print: {pr.name} {pr.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Select "Native Windows Print Dialog" to open the system print dialog (Ctrl+P) on checkout, or select a hardware printer for direct counter spooling.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">Default Receipt Format</label>
                  <select
                    value={formData.default_print_format || 'thermal_80'}
                    onChange={(e) => setFormData({ ...formData, default_print_format: e.target.value as PrintFormat })}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B] text-xs font-medium"
                  >
                    <option value="thermal_80">80mm Thermal Receipt (Standard Counter)</option>
                    <option value="thermal_58">58mm Thermal Receipt (Compact)</option>
                    <option value="a4">A4 Full Sheet GST Tax Invoice</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto_print"
                  checked={formData.auto_print_on_sale ?? true}
                  onChange={(e) => setFormData({ ...formData, auto_print_on_sale: e.target.checked })}
                  className="w-4 h-4 rounded text-[#123F7A] focus:ring-[#123F7A]"
                />
                <label htmlFor="auto_print" className="text-xs font-semibold cursor-pointer">
                  Mandatory Print Prompt: Automatically open print workflow immediately upon sale finalization
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={async () => {
                    const ok = await updateSettings(formData);
                    if (ok) toast.success('Printer preferences saved');
                  }}
                  icon={<Save className="w-4 h-4" />}
                >
                  Save Printer Preferences
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB: APPEARANCE & THEME */}
      {activeTab === 'appearance' && (
        <div className="space-y-4">
          <Card
            title="Desktop Theme & Visual Accessibility"
            subtitle="Switch between crisp Light Mode for daytime counter checkout and Dark Mode for low-light evening operation."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              {/* Light Mode Box */}
              <div
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'border-[#123F7A] bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                    : 'border-[#D1D5DB] dark:border-[#374151] hover:border-gray-400 bg-white dark:bg-[#18212B]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#111827] dark:text-[#F9FAFB]">
                    <Sun className="w-5 h-5 text-amber-500" />
                    <span>Light Mode</span>
                  </div>
                  {theme === 'light' && (
                    <Badge variant="info" size="sm">Active</Badge>
                  )}
                </div>
                <p className="text-gray-700 dark:text-slate-300 text-xs mb-3 font-medium">
                  High-contrast dark text on crisp light surfaces. Ideal for well-lit retail counters, farmer interactions, and direct sunlight conditions.
                </p>
                <div className="p-3 bg-[#F4F6F9] rounded-lg border border-gray-200 text-slate-900 text-[11px] font-mono font-medium">
                  Sample: Invoice ₹12,450.00 • Urea 45kg • Paid
                </div>
              </div>

              {/* Dark Mode Box */}
              <div
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'border-[#6EA8FE] bg-[#1A2634] shadow-xs'
                    : 'border-[#D1D5DB] dark:border-[#374151] hover:border-gray-400 bg-white dark:bg-[#18212B]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#111827] dark:text-[#F9FAFB]">
                    <Moon className="w-5 h-5 text-[#6EA8FE]" />
                    <span>Dark Mode</span>
                  </div>
                  {theme === 'dark' && (
                    <Badge variant="info" size="sm">Active</Badge>
                  )}
                </div>
                <p className="text-gray-700 dark:text-slate-300 text-xs mb-3 font-medium">
                  Deep dark navy surfaces with bright legible text. Reduces eye fatigue during long billing hours and late-night closing.
                </p>
                <div className="p-3 bg-[#10151C] rounded-lg border border-[#374151] text-slate-100 text-[11px] font-mono font-medium">
                  Sample: Invoice ₹12,450.00 • Urea 45kg • Paid
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: BACKUP & RESTORE & AUDIT */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          <Card
            title="Local SQLite Database Protection"
            subtitle="Create and restore complete snapshots of store inventory, customer ledgers, sales, and settings"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <p className="font-semibold text-sm text-[#1F2937] dark:text-[#F3F4F6]">
                  One-Click Offline Database Backup
                </p>
                <p className="text-gray-500 mt-0.5">
                  Backups are generated locally and stored safely in your application data directory.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isBackingUp}
                  onClick={handleCreateBackup}
                  icon={<Download className="w-4 h-4" />}
                >
                  Create Backup Now
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  isLoading={isRestoring}
                  onClick={handleRestoreBackup}
                  icon={<Upload className="w-4 h-4" />}
                >
                  Restore From File
                </Button>
              </div>
            </div>
          </Card>

          {/* Audit Trail */}
          <Card title="System Audit Logs" subtitle="Recent transactional actions, user operations, and price updates" noPadding>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-[#151D26] sticky top-0 border-b border-[#E1E5EA] dark:border-[#303B47] text-gray-500">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="p-3 text-gray-500 whitespace-nowrap">{log.created_at.substring(0, 16)}</td>
                      <td className="p-3 font-semibold">{log.username}</td>
                      <td className="p-3">
                        <span className="font-mono text-[10.5px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 capitalize">{log.entity_type}</td>
                      <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <Card
            title="Local User Accounts & Counter Roles"
            subtitle="Admins manage store configuration; Staff can perform billing and inventory lookups"
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewUserModalOpen(true)}
                icon={<Users className="w-3.5 h-3.5" />}
              >
                + Add User
              </Button>
            }
            noPadding
          >
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-[#151D26] border-b border-[#E1E5EA] dark:border-[#303B47] text-gray-500">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="p-3 text-gray-500">{u.id}</td>
                    <td className="p-3 font-semibold">{u.name}</td>
                    <td className="p-3 font-mono">{u.username}</td>
                    <td className="p-3">
                      {u.role === 'admin' ? (
                        <Badge variant="success" size="sm">Admin</Badge>
                      ) : (
                        <Badge variant="default" size="sm">Billing Staff</Badge>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">{u.created_at.substring(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Add User Modal */}
      {isNewUserModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsNewUserModalOpen(false)}
          title="Create Counter Staff / Admin Account"
          subtitle="Local offline access credentials"
          maxWidth="md"
        >
          <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
            <Input
              label="Full Name *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Suresh Counter Staff"
              required
            />
            <Input
              label="Username *"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. counter1"
              required
            />
            <div>
              <label className="block text-xs font-semibold mb-1">Role *</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
              >
                <option value="staff">Billing Staff (Billing, Inventory, Customer lookup)</option>
                <option value="admin">Store Admin (Full system configuration, backup, user access)</option>
              </select>
            </div>
            <Input
              label="Password *"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsNewUserModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create User
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
