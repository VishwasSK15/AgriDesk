import React, { useState, useEffect, useRef } from 'react';
import { Customer, Product, Batch, PaymentMethod, Sale, StoreSettings } from '../../types';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PrintModal } from '../../components/invoice/PrintModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import {
  Search,
  Plus,
  Trash2,
  Printer,
  PauseCircle,
  Play,
  UserCheck,
  CreditCard,
  Percent,
  AlertTriangle,
  Barcode,
  Calendar,
} from 'lucide-react';

interface Props {
  settings: StoreSettings;
  onNavigateToInvoices?: () => void;
}

export const BillingPage: React.FC<Props> = ({ settings, onNavigateToInvoices }) => {
  const { user } = useAuthStore();
  const {
    customer,
    items,
    discountType,
    discountValue,
    paymentMethod,
    paidAmount,
    notes,
    heldBills,
    setCustomer,
    addItem,
    updateQuantity,
    updateRate,
    updateItemDiscount,
    updateItemBatch,
    removeItem,
    clearCart,
    setDiscount,
    setPaymentMethod,
    setPaidAmount,
    setNotes,
    holdCurrentBill,
    restoreHeldBill,
    deleteHeldBill,
    getSubtotal,
    getTotalDiscount,
    getTotalTax,
    getGrandTotal,
    getRoundOff,
    getBalanceDue,
  } = useCartStore();

  // Search states
  const [productSearch, setProductSearch] = useState('');
  const [matchingProducts, setMatchingProducts] = useState<Product[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Modals
  const [isHeldBillsModalOpen, setIsHeldBillsModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isBatchSelectModalOpen, setIsBatchSelectModalOpen] = useState(false);
  const [productForBatchSelection, setProductForBatchSelection] = useState<Product | null>(null);
  const [finalizedSale, setFinalizedSale] = useState<Sale | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for keyboard navigation
  const productInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const paymentSelectRef = useRef<HTMLSelectElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);

  // Load products and customers
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    if (window.electronAPI) {
      const custs = await window.electronAPI.getCustomers();
      setAllCustomers(custs);
      setFilteredCustomers(custs);
    }
  };

  // Product search with debounce
  useEffect(() => {
    if (!productSearch.trim()) {
      setMatchingProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (window.electronAPI) {
        const prods = await window.electronAPI.getProducts({
          searchQuery: productSearch,
          isActive: true,
        });
        setMatchingProducts(prods);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // Customer filter
  useEffect(() => {
    if (!customerSearch.trim()) {
      setFilteredCustomers(allCustomers);
    } else {
      const q = customerSearch.toLowerCase();
      const filtered = allCustomers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          (c.village && c.village.toLowerCase().includes(q))
      );
      setFilteredCustomers(filtered);
    }
  }, [customerSearch, allCustomers]);

  // Register Counter Keyboard Shortcuts (F1, F2, F3, F5, F6, F9)
  const isAnyModalOpen = Boolean(finalizedSale) || isHeldBillsModalOpen || isNewCustomerModalOpen || isBatchSelectModalOpen;

  useKeyboardShortcuts({
    onF1NewBill: () => {
      if (items.length > 0) {
        if (confirm('Start a new bill? Current unsaved items will be cleared.')) {
          clearCart();
        }
      } else {
        clearCart();
      }
      productInputRef.current?.focus();
      productInputRef.current?.select();
    },
    onF2SearchProduct: () => {
      productInputRef.current?.focus();
      productInputRef.current?.select();
    },
    onF3SearchCustomer: () => {
      customerInputRef.current?.focus();
      customerInputRef.current?.select();
    },
    onF5HoldBill: () => handleHoldBill(),
    onF6RetrieveHeld: () => setIsHeldBillsModalOpen(true),
    onF9SaveFinalize: () => handleSaveAndPrint(true),
    onEscape: () => {
      setIsHeldBillsModalOpen(false);
      setIsNewCustomerModalOpen(false);
      setIsBatchSelectModalOpen(false);
      setIsCustomerDropdownOpen(false);
    },
  }, !isAnyModalOpen);

  const handleProductSelect = (product: Product) => {
    // If product has multiple active batches, prompt batch selection
    if (product.batches && product.batches.length > 1) {
      setProductForBatchSelection(product);
      setIsBatchSelectModalOpen(true);
    } else {
      const batch = product.batches && product.batches.length > 0 ? product.batches[0] : undefined;
      addItem(product, batch, 1);
      toast.info(`Added '${product.name}' to bill`);
    }
    setProductSearch('');
    setMatchingProducts([]);
    productInputRef.current?.focus();
  };

  const handleBatchSelected = (batch: Batch) => {
    if (productForBatchSelection) {
      addItem(productForBatchSelection, batch, 1);
      toast.info(`Added '${productForBatchSelection.name}' (${batch.batch_number})`);
      setProductForBatchSelection(null);
      setIsBatchSelectModalOpen(false);
      productInputRef.current?.focus();
    }
  };

  const handleHoldBill = () => {
    const success = holdCurrentBill();
    if (success) {
      toast.success('Bill held successfully! You can retrieve it anytime (F6).');
      productInputRef.current?.focus();
    } else {
      toast.warning('Cart is empty. Nothing to hold.');
    }
  };

  const handleSaveAndPrint = async (mandatoryPrint = true) => {
    if (items.length === 0) {
      toast.error('Cannot finalize an empty bill. Add at least one item.');
      return;
    }

    // Verify stock availability
    for (const item of items) {
      if (item.quantity <= 0) {
        toast.error(`Invalid quantity for ${item.product_name}`);
        return;
      }
    }

    // Validate customer credit limit if credit sale
    const balanceDue = getBalanceDue();
    if (balanceDue > 0 && customer) {
      if (customer.credit_limit > 0 && (customer.outstanding_balance + balanceDue) > customer.credit_limit) {
        const proceed = confirm(
          `Notice: Customer ${customer.name}'s credit limit is ₹${customer.credit_limit.toLocaleString('en-IN')}.\nCurrent balance: ₹${customer.outstanding_balance.toLocaleString('en-IN')}, New Due: ₹${balanceDue.toLocaleString('en-IN')}.\nDo you want to proceed with authorized credit?`
        );
        if (!proceed) return;
      }
    }

    setIsSubmitting(true);

    try {
      const salePayload = {
        customerId: customer?.id || 1,
        customerName: customer?.name || 'Walk-in Customer',
        customerMobile: customer?.mobile || '',
        customerAddress: customer?.address || '',
        customerGstin: customer?.gstin || '',
        customerVillage: customer?.village || '',
        subtotal: getSubtotal(),
        discountType,
        discountValue,
        totalDiscount: getTotalDiscount(),
        taxAmount: getTotalTax(),
        grandTotal: getGrandTotal(),
        roundOff: getRoundOff(),
        paymentMethod,
        paidAmount,
        balanceDue,
        notes,
        userId: user?.id,
        items: items.map((i) => ({
          product_id: i.product_id,
          batch_id: i.batch_id,
          product_name: i.product_name,
          batch_number: i.batch_number,
          expiry_date: i.expiry_date,
          quantity: i.quantity,
          unit: i.unit,
          rate: i.rate,
          discount_amount: i.discount_amount,
          tax_rate: i.tax_rate,
          taxable_amount: i.taxable_amount,
          tax_amount: i.tax_amount,
          total_amount: i.total_amount,
        })),
      };

      if (window.electronAPI) {
        const res = await window.electronAPI.createSale(salePayload);
        if (res.success && res.sale) {
          toast.success(`Sale ${res.sale.invoice_number} finalized successfully!`);
          setFinalizedSale(res.sale);
          clearCart();
          loadCustomers(); // refresh balances
        } else {
          toast.error(res.error || 'Failed to finalize sale');
        }
      } else {
        // Mock fallback if running outside electron
        const mockSale: Sale = {
          id: Date.now(),
          invoice_number: `INV-${Date.now().toString().slice(-4)}`,
          customer_id: customer?.id,
          customer_name: customer?.name || 'Walk-in Customer',
          customer_mobile: customer?.mobile,
          sale_date: new Date().toISOString(),
          subtotal: getSubtotal(),
          discount_type: discountType,
          discount_value: discountValue,
          total_discount: getTotalDiscount(),
          tax_amount: getTotalTax(),
          grand_total: getGrandTotal(),
          round_off: getRoundOff(),
          payment_method: paymentMethod,
          paid_amount: paidAmount,
          balance_due: balanceDue,
          notes,
          status: 'completed',
          print_status: 'pending',
          print_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [...items],
        };
        toast.success(`Sale ${mockSale.invoice_number} saved!`);
        setFinalizedSale(mockSale);
        clearCart();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // New Customer creation form inside POS
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustVillage, setNewCustVillage] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState('50000');

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustMobile) {
      toast.warning('Name and Mobile number are required');
      return;
    }

    if (window.electronAPI) {
      const res = await window.electronAPI.createCustomer({
        data: {
          name: newCustName,
          mobile: newCustMobile,
          village: newCustVillage,
          credit_limit: Number(newCustCreditLimit) || 50000,
        },
        userId: user?.id,
      });

      if (res.success && res.customer) {
        toast.success(`Customer '${res.customer.name}' added`);
        setCustomer(res.customer);
        loadCustomers();
        setIsNewCustomerModalOpen(false);
        setNewCustName('');
        setNewCustMobile('');
        setNewCustVillage('');
      } else {
        toast.error(res.error || 'Failed to create customer');
      }
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 h-full">
      {/* LEFT 2/3 COLUMN: Customer Header + Product Search + Items Table */}
      <div className="flex-1 flex flex-col min-w-0 space-y-4">
        {/* Helper Context Banner: FEFO Terminology & Shortcuts */}
        <div className="bg-[#EDF7EE] dark:bg-[#1A2E20] border border-[#2D6A4F]/25 dark:border-[#72B77E]/25 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between text-xs text-[#166534] dark:text-[#86EFAC] gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">🌱 FEFO Auto-Batch:</span>
            <span>Batches are auto-selected by First Expiry, First Out to prevent inventory loss.</span>
          </div>
          <div className="flex items-center gap-2.5 font-semibold text-[11px] text-gray-700 dark:text-slate-300">
            <span><kbd className="bg-white/90 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-300 dark:border-slate-700 font-mono">F1</kbd> New</span>
            <span><kbd className="bg-white/90 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-300 dark:border-slate-700 font-mono">F2</kbd> Product</span>
            <span><kbd className="bg-white/90 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-300 dark:border-slate-700 font-mono">F3</kbd> Customer</span>
            <span><kbd className="bg-white/90 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-300 dark:border-slate-700 font-mono">F5</kbd> Hold</span>
            <span><kbd className="bg-white/90 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-300 dark:border-slate-700 font-mono">F6</kbd> Held</span>
            <span><kbd className="bg-white/90 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-300 dark:border-slate-700 font-mono">F9</kbd> Save & Print</span>
          </div>
        </div>

        {/* Customer Header Strip */}
        <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-[280px]">
            <div className="relative flex-1">
              <Input
                ref={customerInputRef}
                placeholder="Search Customer by Name, Mobile, Village (F3)..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setIsCustomerDropdownOpen(true);
                }}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                leftIcon={<Search className="w-4 h-4 text-gray-500 dark:text-slate-400" />}
              />

              {/* Customer Dropdown Results */}
              {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-lg shadow-xl max-h-56 overflow-y-auto">
                  {filteredCustomers.slice(0, 15).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setCustomer(c);
                        setCustomerSearch('');
                        setIsCustomerDropdownOpen(false);
                        productInputRef.current?.focus();
                      }}
                      className="px-3.5 py-2 hover:bg-[#F3F5F8] dark:hover:bg-[#202A35] cursor-pointer text-xs border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{c.name}</span>
                        <span className="text-gray-600 dark:text-slate-300 ml-2 font-medium">Ph: {c.mobile}</span>
                        {c.village && <span className="text-[#2D6A4F] dark:text-[#72B77E] ml-2 font-semibold">({c.village})</span>}
                      </div>
                      {c.outstanding_balance > 0 && (
                        <span className="text-[#991B1B] dark:text-[#FCA5A5] font-bold text-[11px] bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                          Due: ₹{c.outstanding_balance.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setCustomer(null);
                setCustomerSearch('');
                toast.info('Switched to Walk-in Customer');
              }}
            >
              Walk-in
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsNewCustomerModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              + Customer
            </Button>
          </div>

          {/* Active Customer Indicator with Khata Balance vs Credit Limit */}
          <div className="flex items-center gap-3 border-l border-gray-300 dark:border-gray-700 pl-4 text-xs">
            <div className="w-8 h-8 rounded-full bg-[#123F7A]/10 text-[#123F7A] dark:bg-[#6EA8FE]/20 dark:text-[#6EA8FE] flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-2">
                <span>{customer?.name || 'Walk-in Customer'}</span>
                {!customer && (
                  <span className="text-[10px] font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                    Cash Settlement
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-700 dark:text-slate-300 font-medium flex items-center gap-2 mt-0.5">
                <span>{customer?.mobile || 'Direct Counter Sale'}</span>
                {customer && (
                  <>
                    <span className="text-gray-400">•</span>
                    {customer.outstanding_balance > 0 ? (
                      <span className="text-[#991B1B] dark:text-[#FCA5A5] font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded border border-[#DC2626]/20">
                        Khata Due: ₹{customer.outstanding_balance.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-[#166534] dark:text-[#86EFAC] font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-[#166534]/20">
                        Khata Clear (₹0 Due)
                      </span>
                    )}
                    {customer.credit_limit > 0 && (
                      <span className="text-gray-600 dark:text-slate-300 text-[10px]">
                        Limit: ₹{customer.credit_limit.toLocaleString('en-IN')}
                        {customer.outstanding_balance > customer.credit_limit && (
                          <strong className="text-[#DC2626] dark:text-[#F87171] ml-1">(Exceeded!)</strong>
                        )}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product Search & Barcode Input */}
        <div className="relative">
          <Input
            ref={productInputRef}
            placeholder="Scan barcode or type Product Name, SKU, Brand, Category, Formulation (F2)..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            leftIcon={<Barcode className="w-5 h-5 text-[#123F7A] dark:text-[#6EA8FE]" />}
            className="text-base h-12 shadow-xs"
          />

          {/* Product Search Autocomplete */}
          {matchingProducts.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-[#18212B] border border-[#E1E5EA] dark:border-[#303B47] rounded-xl shadow-2xl max-h-72 overflow-y-auto">
              {matchingProducts.map((p) => {
                const isOutOfStock = p.current_stock <= 0;
                const isLowStock = p.current_stock > 0 && p.current_stock <= p.min_stock;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && handleProductSelect(p)}
                    className={`p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs transition-colors ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900/50'
                        : 'hover:bg-[#F3F5F8] dark:hover:bg-[#202A35] cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1F2937] dark:text-[#F3F4F6] text-sm">{p.name}</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
                          {p.sku}
                        </span>
                        <Badge variant="default" size="sm">{p.category}</Badge>
                      </div>
                      <div className="text-[11px] text-[#667085] dark:text-[#AAB4C0] mt-0.5 flex items-center gap-3">
                        {p.active_ingredient && <span>Formulation: {p.active_ingredient}</span>}
                        {p.pack_size && <span>Pack: {p.pack_size}</span>}
                        <span>GST: {p.tax_rate}%</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[#123F7A] dark:text-[#6EA8FE]">
                        ₹{p.selling_rate.toFixed(2)}
                      </div>
                      <div className="text-[11px]">
                        {isOutOfStock ? (
                          <span className="text-[#D64545] font-bold">Out of Stock</span>
                        ) : isLowStock ? (
                          <span className="text-[#C77700] font-semibold">Low: {p.current_stock} {p.unit}</span>
                        ) : (
                          <span className="text-[#3F7D4A] font-medium">Stock: {p.current_stock} {p.unit}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Line Items Table */}
        <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl overflow-hidden flex-1 flex flex-col shadow-xs">
          <div className="px-4 py-2.5 bg-[#F4F6F9] dark:bg-[#202A35] border-b border-[#D1D5DB] dark:border-[#374151] flex items-center justify-between text-xs font-bold text-gray-700 dark:text-slate-200">
            <span>Line Items ({items.length})</span>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[#DC2626] dark:text-[#F87171] hover:underline font-semibold cursor-pointer"
              >
                Clear Cart
              </button>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F1F5F9] dark:bg-[#151D26] text-gray-700 dark:text-slate-200 border-b border-[#D1D5DB] dark:border-[#374151]">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold min-w-[200px]">Product / Formulation</th>
                  <th className="py-2.5 px-3 font-bold w-24">Batch & Exp</th>
                  <th className="py-2.5 px-3 font-bold text-center w-28">Quantity</th>
                  <th className="py-2.5 px-3 font-bold text-right w-24">Rate (₹)</th>
                  <th className="py-2.5 px-3 font-bold text-right w-20">Disc (₹)</th>
                  <th className="py-2.5 px-3 font-bold text-center w-16">GST%</th>
                  <th className="py-2.5 px-3 font-bold text-right w-24">Amount (₹)</th>
                  <th className="py-2.5 px-2 w-8 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D5DB] dark:divide-[#374151]">
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E2836]">
                      <td className="py-2 px-3 text-center text-gray-600 dark:text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-[#111827] dark:text-[#F9FAFB]">
                        {item.product_name}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-1 py-0.5 rounded font-bold">
                          {item.batch_number || 'DEFAULT'}
                        </span>
                        {item.expiry_date && (
                          <div className="text-[10px] text-gray-600 dark:text-slate-400 font-medium mt-0.5">
                            Exp: {item.expiry_date.substring(0, 7)}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(idx, Number(e.target.value))}
                            className="w-16 h-8 text-center border border-[#D1D5DB] dark:border-[#374151] rounded-md bg-white dark:bg-[#18212B] font-bold text-sm text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#123F7A]"
                          />
                          <span className="text-[11px] text-gray-600 dark:text-slate-400 font-medium">{item.unit}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={item.rate}
                          onChange={(e) => updateRate(idx, Number(e.target.value))}
                          className="w-20 h-8 text-right px-2 border border-[#D1D5DB] dark:border-[#374151] rounded-md bg-white dark:bg-[#18212B] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#123F7A]"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.discount_amount || ''}
                          onChange={(e) => updateItemDiscount(idx, Number(e.target.value))}
                          placeholder="0"
                          className="w-16 h-8 text-right px-2 border border-[#D1D5DB] dark:border-[#374151] rounded-md bg-white dark:bg-[#18212B] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#123F7A]"
                        />
                      </td>
                      <td className="py-2 px-3 text-center text-gray-700 dark:text-slate-300 font-semibold">
                        {item.tax_rate}%
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#111827] dark:text-[#F9FAFB]">
                        ₹{item.total_amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-gray-500 hover:text-[#DC2626] dark:hover:text-[#F87171] p-1 rounded transition-colors"
                          title="Remove item from bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-500 dark:text-slate-400">
                      <Barcode className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-slate-500 stroke-1" />
                      <p className="font-bold text-sm text-[#111827] dark:text-[#F9FAFB]">Current bill is empty</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">Scan a barcode or use the product search bar above (F2) to add seeds, fertilizers, or pesticides.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT 1/3 COLUMN: Totals, Discounts, Payment & Mandatory Save & Print */}
      <div className="w-full xl:w-84 shrink-0 flex flex-col space-y-4">
        {/* Bill Summary Card */}
        <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl p-4.5 shadow-xs space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-gray-800 pb-2">
            Payment & Checkout
          </h3>

          {/* Subtotal & Discount row */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-700 dark:text-slate-300 font-medium">
              <span>Item Subtotal:</span>
              <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">₹{getSubtotal().toFixed(2)}</span>
            </div>

            {/* Overall Discount Input */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-gray-300 dark:border-gray-700">
              <span className="text-gray-700 dark:text-slate-300 font-medium">Bill Discount:</span>
              <div className="flex items-center gap-1">
                <input
                  ref={discountInputRef}
                  type="number"
                  min="0"
                  step="any"
                  value={discountValue || ''}
                  onChange={(e) => setDiscount(discountType, Number(e.target.value))}
                  placeholder="0"
                  className="w-16 h-7 text-right px-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-[#18212B] font-semibold text-[#111827] dark:text-[#F9FAFB]"
                />
                <button
                  onClick={() => setDiscount(discountType === 'fixed' ? 'percentage' : 'fixed', discountValue)}
                  className="w-6 h-7 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-xs font-bold rounded flex items-center justify-center border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-slate-200"
                >
                  {discountType === 'percentage' ? '%' : '₹'}
                </button>
              </div>
            </div>

            <div className="flex justify-between text-gray-700 dark:text-slate-300 font-medium">
              <span>GST Tax Amount:</span>
              <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">₹{getTotalTax().toFixed(2)}</span>
            </div>

            {getRoundOff() !== 0 && (
              <div className="flex justify-between text-gray-600 dark:text-slate-400 text-[11px] font-medium">
                <span>Round Off:</span>
                <span>₹{getRoundOff().toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* GRAND TOTAL HIGHLIGHT */}
          <div className="bg-[#123F7A]/5 dark:bg-[#6EA8FE]/10 border border-[#123F7A]/20 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#123F7A] dark:text-[#6EA8FE] uppercase tracking-wider block">
                Grand Total
              </span>
              <span className="text-xs text-gray-500">{items.length} items</span>
            </div>
            <div className="text-2xl font-black text-[#123F7A] dark:text-[#6EA8FE]">
              ₹{getGrandTotal().toLocaleString('en-IN')}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F3F4F6]">
              Payment Method
            </label>
            <select
              ref={paymentSelectRef}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full bg-[#FFFFFF] dark:bg-[#18212B] text-[#1F2937] dark:text-[#F3F4F6] border border-[#E1E5EA] dark:border-[#303B47] rounded-lg h-10 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#123F7A]/30"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI / QR Code</option>
              <option value="card">Debit / Credit Card</option>
              <option value="bank_transfer">Bank Transfer / NEFT</option>
              <option value="credit">Credit / Udhaar (Full Due)</option>
              <option value="mixed">Mixed / Partial Payment</option>
            </select>
          </div>

          {/* Paid Amount and Balance Due */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                Paid Amount
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full h-9 px-2 text-sm font-bold border border-[#E1E5EA] dark:border-[#303B47] rounded-lg bg-white dark:bg-[#18212B] focus:outline-none focus:ring-1 focus:ring-[#123F7A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                Balance Due
              </label>
              <div className={`h-9 px-2 flex items-center font-bold text-sm rounded-lg border border-dashed ${
                getBalanceDue() > 0 ? 'text-[#D64545] border-[#D64545]/40 bg-rose-50/50 dark:bg-rose-950/20' : 'text-[#3F7D4A] border-gray-300'
              }`}>
                ₹{getBalanceDue().toFixed(2)}
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <input
              type="text"
              placeholder="Notes or vehicle/plot details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-8 px-2.5 text-xs border border-[#E1E5EA] dark:border-[#303B47] rounded-lg bg-white dark:bg-[#18212B] placeholder:text-gray-400"
            />
          </div>

          {/* PRIMARY WORKFLOW ACTIONS */}
          <div className="pt-2 space-y-2">
            {/* Save & Print Bill (Mandatory Core Action) */}
            <Button
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              onClick={() => handleSaveAndPrint(true)}
              className="w-full text-base font-bold shadow-md bg-[#123F7A] hover:bg-[#0E3263] h-12"
              icon={<Printer className="w-5 h-5" />}
            >
              <span>Save & Print Bill</span>
              <kbd className="text-[11px] bg-white/20 px-1.5 py-0.5 rounded font-normal ml-1">F9</kbd>
            </Button>

            {/* Hold Bill Secondary Button */}
            <Button
              variant="secondary"
              size="md"
              onClick={handleHoldBill}
              className="w-full justify-center"
              icon={<PauseCircle className="w-4 h-4 text-[#C77700]" />}
            >
              <span>Hold Current Bill</span>
              <kbd className="text-[10px] text-gray-500 ml-1">F5</kbd>
            </Button>
          </div>
        </div>

        {/* Counter Shortcuts Quick Card */}
        <div className="bg-[#F8FAFC] dark:bg-[#141C24] border border-[#E1E5EA] dark:border-[#303B47] rounded-xl p-3 text-[11px] text-[#667085] dark:text-[#AAB4C0] space-y-1">
          <p className="font-semibold text-xs text-[#1F2937] dark:text-[#F3F4F6] mb-1.5">
            Counter Keybindings:
          </p>
          <div className="grid grid-cols-2 gap-1 text-[10.5px]">
            <div><strong className="text-[#123F7A] dark:text-[#6EA8FE]">F1:</strong> New Bill</div>
            <div><strong className="text-[#123F7A] dark:text-[#6EA8FE]">F2:</strong> Search Product</div>
            <div><strong className="text-[#123F7A] dark:text-[#6EA8FE]">F3:</strong> Search Customer</div>
            <div><strong className="text-[#123F7A] dark:text-[#6EA8FE]">F5:</strong> Hold Bill</div>
            <div><strong className="text-[#123F7A] dark:text-[#6EA8FE]">F6:</strong> Retrieve Held</div>
            <div><strong className="text-[#123F7A] dark:text-[#6EA8FE]">F9:</strong> Save & Print</div>
          </div>
        </div>
      </div>

      {/* Held Bills Retrieval Modal (F6) */}
      <Modal
        isOpen={isHeldBillsModalOpen}
        onClose={() => setIsHeldBillsModalOpen(false)}
        title="Held Counter Bills"
        subtitle="Retrieve a previously paused bill to resume checkout"
        maxWidth="lg"
      >
        {heldBills.length > 0 ? (
          <div className="space-y-3">
            {heldBills.map((hb) => (
              <div
                key={hb.id}
                className="p-3.5 border border-[#E1E5EA] dark:border-[#303B47] rounded-xl flex items-center justify-between bg-white dark:bg-[#18212B] hover:border-[#123F7A] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1F2937] dark:text-[#F3F4F6]">
                      {hb.customer?.name || 'Walk-in Customer'}
                    </span>
                    <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      Held at {hb.heldAt}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {hb.items.length} item(s) • Total: <strong>₹{hb.totalAmount.toFixed(2)}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      restoreHeldBill(hb.id);
                      setIsHeldBillsModalOpen(false);
                      toast.success('Held bill restored to active counter');
                    }}
                    icon={<Play className="w-3.5 h-3.5" />}
                  >
                    Resume Bill
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
            No bills currently held on counter.
          </div>
        )}
      </Modal>

      {/* Batch Selection Modal (for products with multiple FEFO batches) */}
      {isBatchSelectModalOpen && productForBatchSelection && (
        <Modal
          isOpen={true}
          onClose={() => setIsBatchSelectModalOpen(false)}
          title={`Select Batch — ${productForBatchSelection.name}`}
          subtitle="Choose stock batch. FEFO (First Expiry, First Out) recommended."
          maxWidth="lg"
        >
          <div className="bg-[#EDF7EE] dark:bg-[#1A2E20] border border-[#2D6A4F]/25 dark:border-[#72B77E]/25 rounded-lg p-2.5 mb-3 text-xs text-[#166534] dark:text-[#86EFAC] flex items-center gap-2 font-medium">
            <span className="font-bold">🌱 FEFO Recommended:</span>
            <span>Batches are sorted with earliest expiration dates first. Auto-selecting the top batch prevents old pesticide/seed inventory from lapsing.</span>
          </div>

          <div className="space-y-2">
            {productForBatchSelection.batches?.map((batch) => (
              <div
                key={batch.id}
                onClick={() => handleBatchSelected(batch)}
                className="p-3 border border-[#D1D5DB] dark:border-[#374151] rounded-xl flex items-center justify-between cursor-pointer hover:border-[#2D6A4F] hover:bg-[#EDF7EE]/40 dark:hover:bg-[#1A2E20]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 font-mono font-bold text-xs text-[#111827] dark:text-[#F9FAFB]">
                    <span>Batch: {batch.batch_number}</span>
                    {batch.expiry_date && (
                      <span className="text-[#9A3412] bg-[#FFF7ED] dark:bg-[#32230B] dark:text-[#FDE68A] text-[10px] px-1.5 py-0.2 rounded font-sans font-bold border border-[#9A3412]/20">
                        Exp: {batch.expiry_date}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-700 dark:text-slate-300 font-medium mt-1">
                    Avail Qty: <strong className="text-[#111827] dark:text-[#F9FAFB]">{batch.quantity}</strong> {productForBatchSelection.unit} • MRP: ₹{batch.mrp}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#3F7D4A]">
                    ₹{batch.selling_rate}
                  </div>
                  <Button variant="agri" size="sm" className="mt-1">
                    Select
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Quick New Customer Modal */}
      <Modal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        title="Add New Customer"
        subtitle="Quick registration for counter billing"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <Input
            label="Customer Name *"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            placeholder="e.g. Ramesh Gowda"
            required
          />
          <Input
            label="Mobile Number *"
            value={newCustMobile}
            onChange={(e) => setNewCustMobile(e.target.value)}
            placeholder="10-digit mobile number"
            required
          />
          <Input
            label="Village / Town"
            value={newCustVillage}
            onChange={(e) => setNewCustVillage(e.target.value)}
            placeholder="e.g. Keregodu"
          />
          <Input
            label="Credit Limit (₹)"
            type="number"
            value={newCustCreditLimit}
            onChange={(e) => setNewCustCreditLimit(e.target.value)}
          />
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsNewCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mandatory Bill Printing Modal immediately upon finalizing a sale */}
      {finalizedSale && (
        <PrintModal
          isOpen={true}
          onClose={() => setFinalizedSale(null)}
          sale={finalizedSale}
          settings={settings}
          isMandatoryPostSale={true}
        />
      )}
    </div>
  );
};
