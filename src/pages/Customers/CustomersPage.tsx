import React, { useState, useEffect } from 'react';
import { Customer, PaymentMethod } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { toast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import {
  Search,
  Plus,
  Users,
  Wallet,
  FileSpreadsheet,
  Edit2,
  CheckCircle2,
  Printer,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { user } = useAuthStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [collectPaymentCustomer, setCollectPaymentCustomer] = useState<Customer | null>(null);

  // Payment Form
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>('cash');
  const [collectRef, setCollectRef] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);

  // Customer Form
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    alternate_mobile: '',
    address: '',
    village: '',
    taluk: '',
    district: '',
    state: 'Karnataka',
    pincode: '',
    gstin: '',
    farm_name: '',
    farm_size: '',
    crop_info: '',
    credit_limit: '50000',
    opening_balance: '0',
  });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const custs = await window.electronAPI.getCustomers(searchQuery);
        setCustomers(custs);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      mobile: '',
      alternate_mobile: '',
      address: '',
      village: '',
      taluk: 'Mandya',
      district: 'Mandya',
      state: 'Karnataka',
      pincode: '',
      gstin: '',
      farm_name: '',
      farm_size: '',
      crop_info: '',
      credit_limit: '50000',
      opening_balance: '0',
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      mobile: c.mobile,
      alternate_mobile: c.alternate_mobile || '',
      address: c.address || '',
      village: c.village || '',
      taluk: c.taluk || '',
      district: c.district || '',
      state: c.state || 'Karnataka',
      pincode: c.pincode || '',
      gstin: c.gstin || '',
      farm_name: c.farm_name || '',
      farm_size: c.farm_size || '',
      crop_info: c.crop_info || '',
      credit_limit: String(c.credit_limit || 50000),
      opening_balance: '0',
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) {
      toast.warning('Name and Mobile number are required');
      return;
    }

    try {
      if (window.electronAPI) {
        if (editingCustomer) {
          const res = await window.electronAPI.updateCustomer({
            id: editingCustomer.id,
            data: {
              name: formData.name,
              mobile: formData.mobile,
              alternate_mobile: formData.alternate_mobile,
              address: formData.address,
              village: formData.village,
              taluk: formData.taluk,
              district: formData.district,
              state: formData.state,
              pincode: formData.pincode,
              gstin: formData.gstin,
              farm_name: formData.farm_name,
              farm_size: formData.farm_size,
              crop_info: formData.crop_info,
              credit_limit: Number(formData.credit_limit) || 50000,
            },
            userId: user?.id,
          });

          if (res.success) {
            toast.success(`Customer '${formData.name}' updated`);
            setIsAddEditModalOpen(false);
            fetchCustomers();
          } else {
            toast.error(res.error || 'Failed to update customer');
          }
        } else {
          const res = await window.electronAPI.createCustomer({
            data: {
              name: formData.name,
              mobile: formData.mobile,
              alternate_mobile: formData.alternate_mobile,
              address: formData.address,
              village: formData.village,
              taluk: formData.taluk,
              district: formData.district,
              state: formData.state,
              pincode: formData.pincode,
              gstin: formData.gstin,
              farm_name: formData.farm_name,
              farm_size: formData.farm_size,
              crop_info: formData.crop_info,
              credit_limit: Number(formData.credit_limit) || 50000,
              openingBalance: Number(formData.opening_balance) || 0,
            },
            userId: user?.id,
          });

          if (res.success) {
            toast.success(`Customer '${formData.name}' registered`);
            setIsAddEditModalOpen(false);
            fetchCustomers();
          } else {
            toast.error(res.error || 'Failed to create customer');
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving customer');
    }
  };

  const handleOpenLedger = async (c: Customer) => {
    setSelectedLedgerCustomer(c);
    if (window.electronAPI) {
      const data = await window.electronAPI.getCustomerLedger(c.id);
      setLedgerData(data);
    }
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectPaymentCustomer || !collectAmount) {
      toast.warning('Please enter payment amount');
      return;
    }

    setIsCollecting(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.collectPayment({
          customerId: collectPaymentCustomer.id,
          amount: Number(collectAmount),
          paymentMethod: collectMethod,
          referenceNumber: collectRef,
          notes: collectNotes,
          userId: user?.id,
        });

        if (res.success) {
          toast.success(`Collected ₹${collectAmount} from ${collectPaymentCustomer.name}`);
          setCollectPaymentCustomer(null);
          setCollectAmount('');
          setCollectNotes('');
          fetchCustomers();
        } else {
          toast.error(res.error || 'Failed to record payment');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing payment');
    } finally {
      setIsCollecting(false);
    }
  };

  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstanding_balance, 0);

  return (
    <div className="space-y-4">
      {/* Guidance & Terminology Banner */}
      <div className="bg-[#EDF7EE] dark:bg-[#1A2E20] border border-[#2D6A4F]/25 dark:border-[#72B77E]/25 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-[#166534] dark:text-[#86EFAC] gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold">🌾 Farmer Khata Ledger:</span>
          <span>Track outstanding customer Udhaar, manage credit limits per farmer, and record payment collections with instant ledger reconciliation.</span>
        </div>
      </div>

      {/* Top Header Strip */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] max-w-md">
          <Input
            placeholder="Search Customer by Name, Mobile, Village, Farm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-500 dark:text-slate-400" />}
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-[#FFF7ED] dark:bg-[#32230B] border border-[#B45309]/30 px-3 py-1.5 rounded-lg text-right">
            <span className="text-gray-700 dark:text-slate-300 block text-[10px] font-semibold">Total Store Udhaar (Due):</span>
            <span className="text-sm font-bold text-[#DC2626] dark:text-[#F87171]">₹{totalOutstanding.toLocaleString('en-IN')}</span>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            icon={<Plus className="w-4 h-4" />}
          >
            Register Customer
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F1F5F9] dark:bg-[#151D26] text-gray-700 dark:text-slate-200 border-b border-[#D1D5DB] dark:border-[#374151] font-bold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-bold min-w-[180px]">Customer / Farmer</th>
                <th className="py-2.5 px-4 font-bold">Mobile Number</th>
                <th className="py-2.5 px-4 font-bold">Village & Taluk</th>
                <th className="py-2.5 px-4 font-bold">Farm & Crops</th>
                <th className="py-2.5 px-4 font-bold text-right">Outstanding (Due)</th>
                <th className="py-2.5 px-4 font-bold text-right">Credit Limit</th>
                <th className="py-2.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1D5DB] dark:divide-[#374151]">
              {customers.length > 0 ? (
                customers.map((c) => {
                  const isOverdue = c.outstanding_balance > 0;
                  const isOverLimit = c.credit_limit > 0 && c.outstanding_balance > c.credit_limit;

                  return (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E2836] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#111827] dark:text-[#F9FAFB]">
                        {c.name}
                        {c.farm_name && (
                          <div className="text-[11px] font-medium text-gray-600 dark:text-slate-400">
                            {c.farm_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-gray-800 dark:text-slate-200">
                        {c.mobile}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-slate-300 font-medium">
                        {c.village || '-'}{c.taluk ? `, ${c.taluk}` : ''}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-slate-300 font-medium">
                        {c.crop_info || '-'}{c.farm_size ? ` (${c.farm_size})` : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-sm">
                        {isOverdue ? (
                          <span className={isOverLimit ? 'text-[#DC2626] dark:text-[#F87171]' : 'text-[#B45309] dark:text-[#FBBF24]'}>
                            ₹{c.outstanding_balance.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-[#166534] dark:text-[#86EFAC] font-bold text-xs">Clear (₹0)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700 dark:text-slate-300 font-medium">
                        ₹{(c.credit_limit || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.outstanding_balance > 0 && (
                            <Button
                              variant="agri"
                              size="sm"
                              onClick={() => {
                                setCollectPaymentCustomer(c);
                                setCollectAmount(String(c.outstanding_balance));
                              }}
                              icon={<Wallet className="w-3.5 h-3.5" />}
                            >
                              Collect
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenLedger(c)}
                            title="View Statement / Ledger"
                            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-[#123F7A]" />}
                          >
                            Ledger
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Customer"
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No customers found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register / Edit Customer Modal */}
      {isAddEditModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddEditModalOpen(false)}
          title={editingCustomer ? `Edit ${editingCustomer.name}` : 'Register New Farmer / Customer'}
          subtitle="Customer profile, agricultural land details, and credit limits"
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Farmer / Customer Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ramesh Gowda"
                required
              />
              <Input
                label="Mobile Number *"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="10-digit mobile number"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Alternate Mobile"
                value={formData.alternate_mobile}
                onChange={(e) => setFormData({ ...formData, alternate_mobile: e.target.value })}
                placeholder="Optional"
              />
              <Input
                label="Village / Town"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                placeholder="e.g. Keregodu"
              />
              <Input
                label="Taluk"
                value={formData.taluk}
                onChange={(e) => setFormData({ ...formData, taluk: e.target.value })}
                placeholder="e.g. Mandya"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Farm / Nursery Name"
                value={formData.farm_name}
                onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                placeholder="e.g. Gowda Organic Farms"
              />
              <Input
                label="Farm Size (Acres)"
                value={formData.farm_size}
                onChange={(e) => setFormData({ ...formData, farm_size: e.target.value })}
                placeholder="e.g. 5 Acres"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Major Crops Grown"
                value={formData.crop_info}
                onChange={(e) => setFormData({ ...formData, crop_info: e.target.value })}
                placeholder="e.g. Sugarcane, Paddy, Tomato"
              />
              <Input
                label="Credit Limit (₹) *"
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                placeholder="50000"
                required
              />
            </div>

            {!editingCustomer && (
              <Input
                label="Opening Outstanding Balance (₹)"
                type="number"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                placeholder="0.00"
              />
            )}

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setIsAddEditModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingCustomer ? 'Update Profile' : 'Save Customer'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Customer Ledger Statement Modal */}
      {selectedLedgerCustomer && ledgerData && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedLedgerCustomer(null);
            setLedgerData(null);
          }}
          title={`Ledger Statement — ${selectedLedgerCustomer.name}`}
          subtitle={`Current Due: ₹${selectedLedgerCustomer.outstanding_balance.toLocaleString('en-IN')} • Mobile: ${selectedLedgerCustomer.mobile}`}
          maxWidth="3xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-gray-500">
                Total Invoiced: <strong>₹{ledgerData.totalPurchases.toFixed(2)}</strong> | Total Paid: <strong>₹{ledgerData.totalPaid.toFixed(2)}</strong>
              </div>
              <Button variant="secondary" onClick={() => setSelectedLedgerCustomer(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3F5F8] dark:bg-[#202A35] font-semibold text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Reference</th>
                    <th className="p-2.5 text-right">Debit (Sale ₹)</th>
                    <th className="p-2.5 text-right">Credit (Paid ₹)</th>
                    <th className="p-2.5 text-right">Balance Due (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {ledgerData.entries.length > 0 ? (
                    ledgerData.entries.map((entry: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2.5 text-gray-500 whitespace-nowrap">{entry.date.substring(0, 16)}</td>
                        <td className="p-2.5">
                          {entry.type === 'INVOICE' ? (
                            <Badge variant="warning" size="sm">Invoice</Badge>
                          ) : (
                            <Badge variant="success" size="sm">Receipt</Badge>
                          )}
                        </td>
                        <td className="p-2.5 font-medium">{entry.reference}</td>
                        <td className="p-2.5 text-right font-medium">
                          {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-medium text-[#3F7D4A]">
                          {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-sm">
                          ₹{entry.balance.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400">
                        No transactions recorded for this customer yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Collect Udhaar Payment Modal */}
      {collectPaymentCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setCollectPaymentCustomer(null)}
          title={`Collect Udhaar Payment — ${collectPaymentCustomer.name}`}
          subtitle={`Total Outstanding: ₹${collectPaymentCustomer.outstanding_balance.toLocaleString('en-IN')}`}
          maxWidth="md"
        >
          <form onSubmit={handleCollectPayment} className="space-y-3.5 text-xs">
            <Input
              label="Amount to Collect (₹) *"
              type="number"
              step="any"
              value={collectAmount}
              onChange={(e) => setCollectAmount(e.target.value)}
              placeholder="0.00"
              required
            />

            <div>
              <label className="block text-xs font-semibold mb-1">Payment Method *</label>
              <select
                value={collectMethod}
                onChange={(e) => setCollectMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
              >
                <option value="cash">Cash Collection</option>
                <option value="upi">UPI / PhonePe / GPay</option>
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="card">Card Payment</option>
              </select>
            </div>

            <Input
              label="Reference / Receipt Number"
              value={collectRef}
              onChange={(e) => setCollectRef(e.target.value)}
              placeholder="Optional transaction reference"
            />

            <div>
              <label className="block text-xs font-semibold mb-1">Notes</label>
              <textarea
                rows={2}
                value={collectNotes}
                onChange={(e) => setCollectNotes(e.target.value)}
                placeholder="e.g. Paid part balance after harvest"
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCollectPaymentCustomer(null)}>
                Cancel
              </Button>
              <Button variant="agri" type="submit" isLoading={isCollecting}>
                Record Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
