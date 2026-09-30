import React, { useState, useEffect } from 'react';
import { Purchase, PurchaseItem, Supplier, Product } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { toast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { Search, Plus, ShoppingCart, Eye, Trash2, Calendar } from 'lucide-react';

export const PurchasesPage: React.FC = () => {
  const { user } = useAuthStore();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [selectedPurchaseForView, setSelectedPurchaseForView] = useState<Purchase | null>(null);

  // Purchase Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().substring(0, 10));
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<Omit<PurchaseItem, 'id' | 'purchase_id'>[]>([]);

  // Current item row state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemBatch, setItemBatch] = useState('');
  const [itemMfg, setItemMfg] = useState('');
  const [itemExp, setItemExp] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemRate, setItemRate] = useState('');
  const [itemSelling, setItemSelling] = useState('');
  const [itemMrp, setItemMrp] = useState('');

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getPurchases();
        setPurchases(data);
        const sups = await window.electronAPI.getSuppliers();
        setSuppliers(sups);
        const prods = await window.electronAPI.getProducts();
        setProducts(prods);
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleProductChange = (prodId: number) => {
    const prod = products.find((p) => p.id === prodId) || null;
    setSelectedProduct(prod);
    if (prod) {
      setItemRate(String(prod.purchase_rate));
      setItemSelling(String(prod.selling_rate));
      setItemMrp(String(prod.mrp));
      setItemBatch(`BAT-${Date.now().toString().slice(-4)}`);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || !itemBatch || Number(itemQty) <= 0 || Number(itemRate) <= 0) {
      toast.warning('Product, Batch, valid Quantity and Purchase Rate are required');
      return;
    }

    const qty = Number(itemQty);
    const rate = Number(itemRate);
    const total = qty * rate;

    const newItem: Omit<PurchaseItem, 'id' | 'purchase_id'> = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      batch_number: itemBatch,
      mfg_date: itemMfg || undefined,
      expiry_date: itemExp || undefined,
      quantity: qty,
      unit: selectedProduct.unit,
      purchase_rate: rate,
      mrp: Number(itemMrp) || rate,
      selling_rate: Number(itemSelling) || rate,
      tax_rate: selectedProduct.tax_rate,
      total_amount: total,
    };

    setPurchaseItems([...purchaseItems, newItem]);
    setSelectedProduct(null);
    setItemQty('1');
    setItemRate('');
    setItemBatch('');
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => purchaseItems.reduce((sum, item) => sum + item.total_amount, 0);

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !invoiceNumber || purchaseItems.length === 0) {
      toast.warning('Supplier, Invoice number, and at least one item are required');
      return;
    }

    const subtotal = calculateSubtotal();
    const paid = Number(paidAmount) || 0;
    const balanceDue = Math.max(0, subtotal - paid);
    const paymentStatus = balanceDue === 0 ? 'paid' : paid > 0 ? 'partial' : 'due';

    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.createPurchase({
          invoiceNumber,
          supplierId: Number(supplierId),
          purchaseDate,
          subtotal,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: subtotal,
          paidAmount: paid,
          balanceDue,
          paymentStatus,
          notes,
          items: purchaseItems,
          userId: user?.id,
        });

        if (res.success) {
          toast.success(`Purchase ${invoiceNumber} saved! Inventory updated.`);
          setIsNewPurchaseModalOpen(false);
          setPurchaseItems([]);
          setInvoiceNumber('');
          setPaidAmount('0');
          setNotes('');
          fetchPurchases();
        } else {
          toast.error(res.error || 'Failed to record purchase');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing purchase');
    }
  };

  const handleViewPurchase = async (p: Purchase) => {
    if (window.electronAPI) {
      const full = await window.electronAPI.getPurchaseById(p.id);
      setSelectedPurchaseForView(full || p);
    } else {
      setSelectedPurchaseForView(p);
    }
  };

  return (
    <div className="space-y-4">
      {/* Guidance & Terminology Banner */}
      <div className="bg-[#EDF7EE] dark:bg-[#1A2E20] border border-[#2D6A4F]/25 dark:border-[#72B77E]/25 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-[#166534] dark:text-[#86EFAC] gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold">📦 Inward Stock Purchases:</span>
          <span>Record official vendor invoices to replenish batch stock and track supplier payables. For internal stock count discrepancies, damage, or disposals, use <strong>Stock Adjustment</strong> under Products.</span>
        </div>
      </div>

      {/* Header Strip */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
            Purchases & Inward Stock Ingestion
          </h2>
          <p className="text-xs text-gray-700 dark:text-slate-300 font-medium">
            Record supplier bills to automatically increase inventory and create batch tracking
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setInvoiceNumber(`SUP-INV-${Date.now().toString().slice(-4)}`);
            setPurchaseItems([]);
            setIsNewPurchaseModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          New Purchase Inward
        </Button>
      </div>

      {/* Purchases Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F1F5F9] dark:bg-[#151D26] text-gray-700 dark:text-slate-200 border-b border-[#D1D5DB] dark:border-[#374151] font-bold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-bold">Purchase Inv #</th>
                <th className="py-2.5 px-4 font-bold">Supplier Name</th>
                <th className="py-2.5 px-4 font-bold">Purchase Date</th>
                <th className="py-2.5 px-4 font-bold text-right">Total (₹)</th>
                <th className="py-2.5 px-4 font-bold text-right">Paid (₹)</th>
                <th className="py-2.5 px-4 font-bold text-right">Balance Due (₹)</th>
                <th className="py-2.5 px-4 font-bold text-center">Status</th>
                <th className="py-2.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1D5DB] dark:divide-[#374151]">
              {purchases.length > 0 ? (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E2836] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#123F7A] dark:text-[#6EA8FE]">
                      {p.invoice_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#111827] dark:text-[#F9FAFB]">
                      {p.supplier_name}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-slate-300 font-medium">
                      {p.purchase_date.substring(0, 10)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#111827] dark:text-[#F9FAFB]">
                      ₹{p.total_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#166534] dark:text-[#86EFAC]">
                      ₹{p.paid_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {p.balance_due > 0 ? (
                        <span className="text-[#DC2626] dark:text-[#F87171]">₹{p.balance_due.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-gray-500 font-normal">₹0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.payment_status === 'paid' ? (
                        <Badge variant="success" size="sm">Paid</Badge>
                      ) : p.payment_status === 'partial' ? (
                        <Badge variant="warning" size="sm">Partial</Badge>
                      ) : (
                        <Badge variant="danger" size="sm">Due</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPurchase(p)}
                        icon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Items
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No inward purchases recorded. Click "New Purchase Inward" to add stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Inward Modal */}
      {isNewPurchaseModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsNewPurchaseModalOpen(false)}
          title="Inward Purchase & Stock Ingestion"
          subtitle="Add supplier bill items to replenish inventory with batch and expiry"
          maxWidth="3xl"
        >
          <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
            {/* Header info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-xs font-semibold mb-1">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Supplier Bill / Invoice # *"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. IFF-2026-901"
                required
              />

              <Input
                label="Purchase Date *"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            {/* Line item entry strip */}
            <div className="p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/20">
              <span className="font-bold text-xs text-[#123F7A] dark:text-[#6EA8FE]">
                + Add Inward Line Item
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold mb-1">Select Product</label>
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => handleProductChange(Number(e.target.value))}
                    className="w-full h-9 px-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">Batch Number *</label>
                  <input
                    type="text"
                    value={itemBatch}
                    onChange={(e) => setItemBatch(e.target.value)}
                    placeholder="Batch #"
                    className="w-full h-9 px-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Mfg Date</label>
                  <input
                    type="date"
                    value={itemMfg}
                    onChange={(e) => setItemMfg(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={itemExp}
                    onChange={(e) => setItemExp(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={itemRate}
                    onChange={(e) => setItemRate(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="agri"
                    size="sm"
                    onClick={handleAddItem}
                    className="w-full h-9"
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Item
                  </Button>
                </div>
              </div>
            </div>

            {/* Inward Items Table */}
            {purchaseItems.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 font-semibold">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2">Batch</th>
                      <th className="p-2">Exp Date</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Purchase Rate</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {purchaseItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{item.product_name}</td>
                        <td className="p-2 font-mono text-[11px]">{item.batch_number}</td>
                        <td className="p-2">{item.expiry_date || '-'}</td>
                        <td className="p-2 text-center font-bold">{item.quantity} {item.unit}</td>
                        <td className="p-2 text-right">₹{item.purchase_rate}</td>
                        <td className="p-2 text-right font-bold">₹{item.total_amount.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total and Payment */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500">Total Purchase Value:</span>
                <span className="text-xl font-black text-[#123F7A] dark:text-[#6EA8FE] ml-2">
                  ₹{calculateSubtotal().toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-36">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Paid Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full h-8 px-2 text-xs font-bold border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-[#18212B]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setIsNewPurchaseModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Finalize Inward Purchase & Update Stock
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Purchase Details Modal */}
      {selectedPurchaseForView && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPurchaseForView(null)}
          title={`Purchase ${selectedPurchaseForView.invoice_number}`}
          subtitle={`From ${selectedPurchaseForView.supplier_name} on ${selectedPurchaseForView.purchase_date.substring(0, 10)}`}
          maxWidth="2xl"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg flex justify-between">
              <div>
                <p><strong>Supplier:</strong> {selectedPurchaseForView.supplier_name}</p>
                <p><strong>Invoice #:</strong> {selectedPurchaseForView.invoice_number}</p>
              </div>
              <div className="text-right">
                <p><strong>Total:</strong> ₹{selectedPurchaseForView.total_amount.toFixed(2)}</p>
                <p><strong>Paid:</strong> ₹{selectedPurchaseForView.paid_amount.toFixed(2)}</p>
                <p className="text-[#D64545] font-bold"><strong>Due:</strong> ₹{selectedPurchaseForView.balance_due.toFixed(2)}</p>
              </div>
            </div>

            <table className="w-full text-left border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead className="bg-gray-100 dark:bg-gray-800 font-semibold">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2">Batch</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Purchase Rate</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {selectedPurchaseForView.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-medium">{item.product_name}</td>
                    <td className="p-2 font-mono text-[11px]">{item.batch_number}</td>
                    <td className="p-2 text-center">{item.quantity} {item.unit}</td>
                    <td className="p-2 text-right">₹{item.purchase_rate.toFixed(2)}</td>
                    <td className="p-2 text-right font-bold">₹{item.total_amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
};
