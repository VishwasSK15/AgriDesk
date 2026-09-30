export type UserRole = 'admin' | 'staff';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  mobile: string;
  alternate_mobile?: string;
  address?: string;
  village?: string;
  taluk?: string;
  district?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  farm_name?: string;
  farm_size?: string;
  crop_info?: string;
  outstanding_balance: number;
  credit_limit: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  gstin?: string;
  license_info?: string;
  payment_terms?: string;
  outstanding_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  manufacturer?: string;
  unit: string;
  hsn_sac?: string;
  purchase_rate: number;
  selling_rate: number;
  mrp: number;
  default_discount: number;
  tax_rate: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  active_ingredient?: string;
  pack_size?: string;
  notes?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  batches?: Batch[];
}

export interface Batch {
  id: number;
  product_id: number;
  batch_number: string;
  mfg_date?: string;
  expiry_date?: string;
  quantity: number;
  purchase_rate: number;
  mrp: number;
  selling_rate: number;
  is_active: number;
  created_at: string;
  product_name?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit' | 'mixed';
export type SaleStatus = 'completed' | 'cancelled' | 'draft';
export type PrintStatus = 'printed' | 'pending' | 'failed';
export type PrintFormat = 'thermal_58' | 'thermal_80' | 'a4' | 'pdf';

export interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id: number;
  batch_id?: number;
  product_name: string;
  batch_number?: string;
  expiry_date?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_amount: number;
  tax_rate: number;
  taxable_amount: number;
  tax_amount: number;
  total_amount: number;
}

export interface Sale {
  id: number;
  invoice_number: string;
  customer_id?: number;
  customer_name: string;
  customer_mobile?: string;
  customer_address?: string;
  customer_gstin?: string;
  customer_village?: string;
  sale_date: string;
  subtotal: number;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  total_discount: number;
  tax_amount: number;
  grand_total: number;
  round_off: number;
  payment_method: PaymentMethod;
  paid_amount: number;
  balance_due: number;
  notes?: string;
  status: SaleStatus;
  print_status: PrintStatus;
  print_count: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
}

export interface PurchaseItem {
  id?: number;
  purchase_id?: number;
  product_id: number;
  product_name?: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date?: string;
  quantity: number;
  unit: string;
  purchase_rate: number;
  mrp: number;
  selling_rate: number;
  tax_rate: number;
  total_amount: number;
}

export interface Purchase {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name: string;
  purchase_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_status: 'paid' | 'partial' | 'due';
  notes?: string;
  created_by?: number;
  created_at: string;
  items?: PurchaseItem[];
}

export interface Payment {
  id: number;
  customer_id?: number;
  supplier_id?: number;
  sale_id?: number;
  purchase_id?: number;
  type: 'customer_payment' | 'supplier_payment' | 'sale_collection' | 'refund';
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  payment_date: string;
  created_by?: number;
  created_at: string;
  customer_name?: string;
  supplier_name?: string;
  invoice_number?: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  batch_id?: number;
  product_name?: string;
  batch_number?: string;
  quantity_change: number;
  movement_type: 'sale' | 'purchase' | 'return' | 'adjustment' | 'damage' | 'expiry';
  reference_type?: string;
  reference_id?: number;
  reason?: string;
  previous_stock: number;
  new_stock: number;
  created_by?: number;
  created_at: string;
}

export interface PrintJob {
  id: number;
  sale_id: number;
  invoice_number: string;
  printer_name?: string;
  print_type: PrintFormat;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  created_at: string;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  tagline?: string;
  proprietor_name?: string;
  address?: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  dl_number_1?: string;
  dl_number_2?: string;
  state?: string;
  state_code?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  invoice_prefix: string;
  default_printer?: string;
  default_print_format: PrintFormat;
  auto_print_on_sale: boolean;
  terms_and_conditions?: string;
  low_stock_threshold_default: number;
  expiry_alert_days: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  todaySales: number;
  billsTodayCount: number;
  todayCollections: number;
  totalCustomerOutstanding: number;
  currentInventoryValue: number;
  lowStockCount: number;
  expiringStockCount: number;
  outOfStockCount: number;
  recentSales: Sale[];
  topProductsToday: { product_name: string; quantity: number; amount: number }[];
  highPriorityAlerts: { id: string; type: 'stock' | 'expiry' | 'credit'; title: string; message: string; severity: 'warning' | 'danger' }[];
  conciseInsightSummary: string;
}

export interface SalesInsightReport {
  period: 'today' | 'week' | 'month' | 'year';
  currentSales: number;
  previousSales: number;
  salesGrowthPercent: number;
  invoicesCount: number;
  averageBillValue: number;
  totalQuantitySold: number;
  totalDiscountsGiven: number;
  topProducts: { product_id: number; name: string; category: string; quantity: number; revenue: number }[];
  categoryShare: { category: string; revenue: number; percentage: number }[];
  paymentSplit: { method: string; amount: number; percentage: number }[];
  creditVsPaid: { paidAmount: number; creditAmount: number; creditPercent: number };
  peakDayOrTime?: string;
  hasEnoughData: boolean;
  insightsText: string[];
}

export interface InventoryInsightReport {
  totalStockValue: number;
  activeProductsCount: number;
  outOfStockCount: number;
  lowStockItems: { product_id: number; name: string; current_stock: number; min_stock: number; unit: string }[];
  expiringItems: { batch_id: number; product_name: string; batch_number: string; quantity: number; expiry_date: string; days_left: number }[];
  fastMovingItems: { product_id: number; name: string; quantity_sold: number; current_stock: number }[];
  slowMovingItems: { product_id: number; name: string; current_stock: number; days_without_sale: number }[];
  reorderSuggestions: { product_id: number; name: string; current_stock: number; min_stock: number; suggested_qty: number; reason: string }[];
  hasEnoughData: boolean;
  insightsText: string[];
}
