import { create } from 'zustand';
import { Customer, Product, Batch, SaleItem, PaymentMethod } from '../types';

export interface HeldBill {
  id: string;
  heldAt: string;
  customer: Customer | null;
  items: SaleItem[];
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  paymentMethod: PaymentMethod;
  notes: string;
  totalAmount: number;
}

interface CartState {
  customer: Customer | null;
  items: SaleItem[];
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  notes: string;
  heldBills: HeldBill[];

  // Actions
  setCustomer: (customer: Customer | null) => void;
  addItem: (product: Product, batch?: Batch, quantity?: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  updateRate: (index: number, rate: number) => void;
  updateItemDiscount: (index: number, discountAmount: number) => void;
  updateItemBatch: (index: number, batch: Batch) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  setDiscount: (type: 'fixed' | 'percentage', value: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setPaidAmount: (amount: number) => void;
  setNotes: (notes: string) => void;

  // Hold / Resume
  holdCurrentBill: () => boolean;
  restoreHeldBill: (id: string) => void;
  deleteHeldBill: (id: string) => void;

  // Computations
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getTotalTax: () => number;
  getGrandTotal: () => number;
  getRoundOff: () => number;
  getBalanceDue: () => number;
}

const defaultCustomer: Customer = {
  id: 1,
  name: 'Walk-in Customer',
  mobile: '0000000000',
  address: 'Local Counter',
  village: 'Local',
  outstanding_balance: 0,
  credit_limit: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function calculateLineItem(
  item: Omit<SaleItem, 'taxable_amount' | 'tax_amount' | 'total_amount'>
): SaleItem {
  const lineBase = item.quantity * item.rate;
  const lineDiscount = item.discount_amount || 0;
  const taxable_amount = Math.max(0, lineBase - lineDiscount);
  const tax_amount = Math.round((taxable_amount * (item.tax_rate / 100)) * 100) / 100;
  const total_amount = Math.round((taxable_amount + tax_amount) * 100) / 100;

  return {
    ...item,
    taxable_amount,
    tax_amount,
    total_amount,
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  customer: defaultCustomer,
  items: [],
  discountType: 'fixed',
  discountValue: 0,
  paymentMethod: 'cash',
  paidAmount: 0,
  notes: '',
  heldBills: [],

  setCustomer: (customer) => set({ customer: customer || defaultCustomer }),

  addItem: (product, batch, initialQty = 1) => {
    const state = get();
    // Default to the first available batch if not specified
    const selectedBatch = batch || (product.batches && product.batches.length > 0 ? product.batches[0] : undefined);
    const rate = selectedBatch ? selectedBatch.selling_rate : product.selling_rate;
    const taxRate = product.tax_rate || 0;

    // Check if item with same product and batch already exists in cart
    const existingIndex = state.items.findIndex(
      (item) => item.product_id === product.id && item.batch_id === (selectedBatch?.id || undefined)
    );

    if (existingIndex >= 0) {
      // Increment quantity
      const existing = state.items[existingIndex];
      const newQty = existing.quantity + initialQty;
      state.updateQuantity(existingIndex, newQty);
    } else {
      const newItem = calculateLineItem({
        product_id: product.id,
        batch_id: selectedBatch?.id,
        product_name: product.name,
        batch_number: selectedBatch?.batch_number || 'DEFAULT',
        expiry_date: selectedBatch?.expiry_date,
        quantity: initialQty,
        unit: product.unit || 'Bag',
        rate,
        discount_amount: 0,
        tax_rate: taxRate,
      });

      const newItems = [...state.items, newItem];
      set({ items: newItems });

      // Auto-update paid amount if full payment method
      if (['cash', 'upi', 'card', 'bank_transfer'].includes(state.paymentMethod)) {
        setTimeout(() => {
          set({ paidAmount: get().getGrandTotal() });
        }, 10);
      }
    }
  },

  updateQuantity: (index, quantity) => {
    if (quantity <= 0) {
      get().removeItem(index);
      return;
    }
    const state = get();
    const item = state.items[index];
    if (!item) return;

    const updatedItem = calculateLineItem({
      ...item,
      quantity,
    });

    const newItems = [...state.items];
    newItems[index] = updatedItem;
    set({ items: newItems });

    if (['cash', 'upi', 'card', 'bank_transfer'].includes(state.paymentMethod)) {
      setTimeout(() => {
        set({ paidAmount: get().getGrandTotal() });
      }, 10);
    }
  },

  updateRate: (index, rate) => {
    const state = get();
    const item = state.items[index];
    if (!item) return;

    const updatedItem = calculateLineItem({
      ...item,
      rate: Math.max(0, rate),
    });

    const newItems = [...state.items];
    newItems[index] = updatedItem;
    set({ items: newItems });

    if (['cash', 'upi', 'card', 'bank_transfer'].includes(state.paymentMethod)) {
      setTimeout(() => {
        set({ paidAmount: get().getGrandTotal() });
      }, 10);
    }
  },

  updateItemDiscount: (index, discountAmount) => {
    const state = get();
    const item = state.items[index];
    if (!item) return;

    const updatedItem = calculateLineItem({
      ...item,
      discount_amount: Math.max(0, discountAmount),
    });

    const newItems = [...state.items];
    newItems[index] = updatedItem;
    set({ items: newItems });
  },

  updateItemBatch: (index, batch) => {
    const state = get();
    const item = state.items[index];
    if (!item) return;

    const updatedItem = calculateLineItem({
      ...item,
      batch_id: batch.id,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      rate: batch.selling_rate || item.rate,
    });

    const newItems = [...state.items];
    newItems[index] = updatedItem;
    set({ items: newItems });
  },

  removeItem: (index) => {
    const state = get();
    const newItems = state.items.filter((_, i) => i !== index);
    set({ items: newItems });

    if (['cash', 'upi', 'card', 'bank_transfer'].includes(state.paymentMethod)) {
      setTimeout(() => {
        set({ paidAmount: get().getGrandTotal() });
      }, 10);
    }
  },

  clearCart: () => {
    set({
      customer: defaultCustomer,
      items: [],
      discountType: 'fixed',
      discountValue: 0,
      paymentMethod: 'cash',
      paidAmount: 0,
      notes: '',
    });
  },

  setDiscount: (type, value) => {
    set({ discountType: type, discountValue: Math.max(0, value) });
    const state = get();
    if (['cash', 'upi', 'card', 'bank_transfer'].includes(state.paymentMethod)) {
      setTimeout(() => {
        set({ paidAmount: get().getGrandTotal() });
      }, 10);
    }
  },

  setPaymentMethod: (method) => {
    const grandTotal = get().getGrandTotal();
    let paidAmount = 0;
    if (['cash', 'upi', 'card', 'bank_transfer'].includes(method)) {
      paidAmount = grandTotal;
    } else if (method === 'credit') {
      paidAmount = 0;
    } else {
      paidAmount = get().paidAmount || grandTotal;
    }
    set({ paymentMethod: method, paidAmount });
  },

  setPaidAmount: (amount) => set({ paidAmount: Math.max(0, amount) }),
  setNotes: (notes) => set({ notes }),

  holdCurrentBill: () => {
    const state = get();
    if (state.items.length === 0) return false;

    const heldBill: HeldBill = {
      id: Date.now().toString(),
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customer: state.customer,
      items: [...state.items],
      discountType: state.discountType,
      discountValue: state.discountValue,
      paymentMethod: state.paymentMethod,
      notes: state.notes,
      totalAmount: state.getGrandTotal(),
    };

    set((s) => ({
      heldBills: [...s.heldBills, heldBill],
      customer: defaultCustomer,
      items: [],
      discountType: 'fixed',
      discountValue: 0,
      paymentMethod: 'cash',
      paidAmount: 0,
      notes: '',
    }));

    return true;
  },

  restoreHeldBill: (id) => {
    const state = get();
    const held = state.heldBills.find((b) => b.id === id);
    if (!held) return;

    set({
      customer: held.customer,
      items: held.items,
      discountType: held.discountType,
      discountValue: held.discountValue,
      paymentMethod: held.paymentMethod,
      notes: held.notes,
      paidAmount: ['cash', 'upi', 'card', 'bank_transfer'].includes(held.paymentMethod) ? held.totalAmount : 0,
      heldBills: state.heldBills.filter((b) => b.id !== id),
    });
  },

  deleteHeldBill: (id) => {
    set((s) => ({ heldBills: s.heldBills.filter((b) => b.id !== id) }));
  },

  getSubtotal: () => {
    return Math.round(get().items.reduce((sum, item) => sum + (item.quantity * item.rate), 0) * 100) / 100;
  },

  getTotalDiscount: () => {
    const state = get();
    const itemsDiscount = state.items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
    const subtotal = state.getSubtotal();
    let billDiscount = 0;
    if (state.discountType === 'percentage') {
      billDiscount = (subtotal * state.discountValue) / 100;
    } else {
      billDiscount = state.discountValue;
    }
    return Math.round((itemsDiscount + billDiscount) * 100) / 100;
  },

  getTotalTax: () => {
    return Math.round(get().items.reduce((sum, item) => sum + item.tax_amount, 0) * 100) / 100;
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal();
    const totalDiscount = get().getTotalDiscount();
    const totalTax = get().getTotalTax();
    const raw = Math.max(0, subtotal - totalDiscount + totalTax);
    return Math.round(raw);
  },

  getRoundOff: () => {
    const subtotal = get().getSubtotal();
    const totalDiscount = get().getTotalDiscount();
    const totalTax = get().getTotalTax();
    const raw = Math.max(0, subtotal - totalDiscount + totalTax);
    const rounded = Math.round(raw);
    return Math.round((rounded - raw) * 100) / 100;
  },

  getBalanceDue: () => {
    const grand = get().getGrandTotal();
    const paid = get().paidAmount;
    return Math.max(0, Math.round((grand - paid) * 100) / 100);
  },
}));
