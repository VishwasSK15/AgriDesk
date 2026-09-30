import React, { useState, useEffect } from 'react';
import { Supplier, PaymentMethod } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { Search, Plus, Truck, Wallet, Edit2 } from 'lucide-react';

export const SuppliersPage: React.FC = () => {
  const { user } = useAuthStore();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    gstin: '',
    license_info: '',
    payment_terms: '30 Days Net',
  });

  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const sups = await window.electronAPI.getSuppliers(searchQuery);
        setSuppliers(sups);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [searchQuery]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      address: '',
      gstin: '',
      license_info: '',
      payment_terms: '30 Days Net',
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      mobile: s.mobile,
      email: s.email || '',
      address: s.address || '',
      gstin: s.gstin || '',
      license_info: s.license_info || '',
      payment_terms: s.payment_terms || '30 Days Net',
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) {
      toast.warning('Supplier name and mobile are required');
      return;
    }

    try {
      if (window.electronAPI) {
        if (editingSupplier) {
          const res = await window.electronAPI.updateSupplier({
            id: editingSupplier.id,
            data: formData,
            userId: user?.id,
          });
          if (res.success) {
            toast.success(`Supplier '${formData.name}' updated`);
            setIsAddEditModalOpen(false);
            fetchSuppliers();
          } else {
            toast.error(res.error || 'Failed to update supplier');
          }
        } else {
          const res = await window.electronAPI.createSupplier({
            data: formData,
            userId: user?.id,
          });
          if (res.success) {
            toast.success(`Supplier '${formData.name}' added`);
            setIsAddEditModalOpen(false);
            fetchSuppliers();
          } else {
            toast.error(res.error || 'Failed to create supplier');
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving supplier');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplier || !payAmount) {
      toast.warning('Please enter payment amount');
      return;
    }

    setIsPaying(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.recordSupplierPayment({
          supplierId: paySupplier.id,
          amount: Number(payAmount),
          paymentMethod: payMethod,
          referenceNumber: payRef,
          notes: payNotes,
          userId: user?.id,
        });

        if (res.success) {
          toast.success(`Payment of ₹${payAmount} recorded to ${paySupplier.name}`);
          setPaySupplier(null);
          setPayAmount('');
          setPayNotes('');
          fetchSuppliers();
        } else {
          toast.error(res.error || 'Failed to record payment');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error recording payment');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Strip */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#E1E5EA] dark:border-[#303B47] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] max-w-md">
          <Input
            placeholder="Search Supplier, Company, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAdd}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Supplier
        </Button>
      </div>

      {/* Suppliers Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#E1E5EA] dark:border-[#303B47] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] dark:bg-[#151D26] text-[#667085] dark:text-[#AAB4C0] border-b border-[#E1E5EA] dark:border-[#303B47]">
              <tr>
                <th className="py-2.5 px-4 font-semibold min-w-[180px]">Supplier / Company</th>
                <th className="py-2.5 px-4 font-semibold">Contact Details</th>
                <th className="py-2.5 px-4 font-semibold">GSTIN</th>
                <th className="py-2.5 px-4 font-semibold">License Info</th>
                <th className="py-2.5 px-4 font-semibold">Payment Terms</th>
                <th className="py-2.5 px-4 font-semibold text-right">Outstanding (Payable)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E5EA] dark:divide-[#303B47]">
              {suppliers.length > 0 ? (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E2836] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#1F2937] dark:text-[#F3F4F6]">
                      {s.name}
                      {s.address && (
                        <div className="text-[11px] font-normal text-gray-500 mt-0.5">{s.address}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-gray-700 dark:text-gray-300">{s.mobile}</div>
                      {s.email && <div className="text-[11px] text-gray-400">{s.email}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono">{s.gstin || '-'}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{s.license_info || '-'}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{s.payment_terms || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-sm">
                      {s.outstanding_balance > 0 ? (
                        <span className="text-[#D64545]">₹{s.outstanding_balance.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-[#3F7D4A] text-xs">Clear (₹0)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.outstanding_balance > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setPaySupplier(s);
                              setPayAmount(String(s.outstanding_balance));
                            }}
                            icon={<Wallet className="w-3.5 h-3.5 text-[#123F7A]" />}
                          >
                            Pay
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(s)}
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No suppliers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {isAddEditModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddEditModalOpen(false)}
          title={editingSupplier ? `Edit ${editingSupplier.name}` : 'Add Fertilizer / Seed Supplier'}
          subtitle="Distributor profile, GST details, and payment terms"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveSupplier} className="space-y-3.5 text-xs">
            <Input
              label="Supplier / Company Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. IFFCO Fertilizers Ltd"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Mobile / Phone *"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="Contact number"
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="supplier@company.com"
              />
            </div>
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Warehouse / Depot address"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="GSTIN"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="15-digit GSTIN"
              />
              <Input
                label="License / Drug Auth No"
                value={formData.license_info}
                onChange={(e) => setFormData({ ...formData, license_info: e.target.value })}
                placeholder="e.g. FERT-DIST-2024"
              />
            </div>
            <Input
              label="Payment Terms"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              placeholder="e.g. 15 Days Net, Immediate"
            />
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsAddEditModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Supplier
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Pay Supplier Modal */}
      {paySupplier && (
        <Modal
          isOpen={true}
          onClose={() => setPaySupplier(null)}
          title={`Pay Supplier — ${paySupplier.name}`}
          subtitle={`Total Payable Due: ₹${paySupplier.outstanding_balance.toLocaleString('en-IN')}`}
          maxWidth="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
            <Input
              label="Payment Amount (₹) *"
              type="number"
              step="any"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
              >
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="upi">UPI / Online</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <Input
              label="UTR / Reference Number"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="Bank UTR or check number"
            />
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPaySupplier(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isPaying}>
                Record Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
