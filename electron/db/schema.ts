import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('staff'), // 'admin' | 'staff'
  password_hash: text('password_hash').notNull(),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  mobile: text('mobile').notNull(),
  alternate_mobile: text('alternate_mobile'),
  address: text('address'),
  village: text('village'),
  taluk: text('taluk'),
  district: text('district'),
  state: text('state').default('Karnataka'),
  pincode: text('pincode'),
  gstin: text('gstin'),
  farm_name: text('farm_name'),
  farm_size: text('farm_size'),
  crop_info: text('crop_info'),
  outstanding_balance: real('outstanding_balance').notNull().default(0),
  credit_limit: real('credit_limit').notNull().default(50000),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  mobile: text('mobile').notNull(),
  email: text('email'),
  address: text('address'),
  gstin: text('gstin'),
  license_info: text('license_info'),
  payment_terms: text('payment_terms'),
  outstanding_balance: real('outstanding_balance').notNull().default(0),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode'),
  category: text('category').notNull(), // 'Fertilizers' | 'Pesticides' | 'Seeds' | 'Crop Nutrition' | 'Hardware/Tools' | 'Other'
  subcategory: text('subcategory'),
  brand: text('brand'),
  manufacturer: text('manufacturer'),
  unit: text('unit').notNull().default('Bag'), // 'Bag', 'Kg', 'Litre', 'Piece', etc.
  hsn_sac: text('hsn_sac'),
  purchase_rate: real('purchase_rate').notNull().default(0),
  selling_rate: real('selling_rate').notNull().default(0),
  mrp: real('mrp').notNull().default(0),
  default_discount: real('default_discount').notNull().default(0),
  tax_rate: real('tax_rate').notNull().default(0), // 0, 5, 12, 18, 28
  current_stock: real('current_stock').notNull().default(0),
  min_stock: real('min_stock').notNull().default(10), // reorder level
  max_stock: real('max_stock').notNull().default(1000),
  active_ingredient: text('active_ingredient'),
  pack_size: text('pack_size'),
  notes: text('notes'),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const batches = sqliteTable('batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id),
  batch_number: text('batch_number').notNull(),
  mfg_date: text('mfg_date'),
  expiry_date: text('expiry_date'),
  quantity: real('quantity').notNull().default(0),
  purchase_rate: real('purchase_rate').notNull().default(0),
  mrp: real('mrp').notNull().default(0),
  selling_rate: real('selling_rate').notNull().default(0),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_number: text('invoice_number').notNull().unique(),
  customer_id: integer('customer_id').references(() => customers.id),
  customer_name: text('customer_name').notNull(),
  customer_mobile: text('customer_mobile'),
  customer_address: text('customer_address'),
  customer_gstin: text('customer_gstin'),
  customer_village: text('customer_village'),
  sale_date: text('sale_date').notNull(),
  subtotal: real('subtotal').notNull(),
  discount_type: text('discount_type').notNull().default('fixed'), // 'fixed' | 'percentage'
  discount_value: real('discount_value').notNull().default(0),
  total_discount: real('total_discount').notNull().default(0),
  tax_amount: real('tax_amount').notNull().default(0),
  grand_total: real('grand_total').notNull(),
  round_off: real('round_off').notNull().default(0),
  payment_method: text('payment_method').notNull().default('cash'), // 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit' | 'mixed'
  paid_amount: real('paid_amount').notNull().default(0),
  balance_due: real('balance_due').notNull().default(0),
  notes: text('notes'),
  status: text('status').notNull().default('completed'), // 'completed' | 'cancelled' | 'draft'
  print_status: text('print_status').notNull().default('pending'), // 'printed' | 'pending' | 'failed'
  print_count: integer('print_count').notNull().default(0),
  created_by: integer('created_by').references(() => users.id),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const sale_items = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sale_id: integer('sale_id').notNull().references(() => sales.id),
  product_id: integer('product_id').notNull().references(() => products.id),
  batch_id: integer('batch_id').references(() => batches.id),
  product_name: text('product_name').notNull(),
  batch_number: text('batch_number'),
  expiry_date: text('expiry_date'),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  rate: real('rate').notNull(),
  discount_amount: real('discount_amount').notNull().default(0),
  tax_rate: real('tax_rate').notNull().default(0),
  taxable_amount: real('taxable_amount').notNull().default(0),
  tax_amount: real('tax_amount').notNull().default(0),
  total_amount: real('total_amount').notNull(),
});

export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_number: text('invoice_number').notNull(),
  supplier_id: integer('supplier_id').notNull().references(() => suppliers.id),
  supplier_name: text('supplier_name').notNull(),
  purchase_date: text('purchase_date').notNull(),
  subtotal: real('subtotal').notNull(),
  tax_amount: real('tax_amount').notNull().default(0),
  discount_amount: real('discount_amount').notNull().default(0),
  total_amount: real('total_amount').notNull(),
  paid_amount: real('paid_amount').notNull().default(0),
  balance_due: real('balance_due').notNull().default(0),
  payment_status: text('payment_status').notNull().default('paid'), // 'paid' | 'partial' | 'due'
  notes: text('notes'),
  created_by: integer('created_by').references(() => users.id),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const purchase_items = sqliteTable('purchase_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchase_id: integer('purchase_id').notNull().references(() => purchases.id),
  product_id: integer('product_id').notNull().references(() => products.id),
  product_name: text('product_name').notNull(),
  batch_number: text('batch_number').notNull(),
  mfg_date: text('mfg_date'),
  expiry_date: text('expiry_date'),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  purchase_rate: real('purchase_rate').notNull(),
  mrp: real('mrp').notNull(),
  selling_rate: real('selling_rate').notNull(),
  tax_rate: real('tax_rate').notNull().default(0),
  total_amount: real('total_amount').notNull(),
});

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customer_id: integer('customer_id').references(() => customers.id),
  supplier_id: integer('supplier_id').references(() => suppliers.id),
  sale_id: integer('sale_id').references(() => sales.id),
  purchase_id: integer('purchase_id').references(() => purchases.id),
  type: text('type').notNull(), // 'customer_payment' | 'supplier_payment' | 'sale_collection' | 'refund'
  amount: real('amount').notNull(),
  payment_method: text('payment_method').notNull().default('cash'),
  reference_number: text('reference_number'),
  notes: text('notes'),
  payment_date: text('payment_date').notNull(),
  created_by: integer('created_by').references(() => users.id),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const stock_movements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id),
  batch_id: integer('batch_id').references(() => batches.id),
  product_name: text('product_name'),
  batch_number: text('batch_number'),
  quantity_change: real('quantity_change').notNull(),
  movement_type: text('movement_type').notNull(), // 'sale' | 'purchase' | 'return' | 'adjustment' | 'damage' | 'expiry'
  reference_type: text('reference_type'),
  reference_id: integer('reference_id'),
  reason: text('reason'),
  previous_stock: real('previous_stock').notNull(),
  new_stock: real('new_stock').notNull(),
  created_by: integer('created_by').references(() => users.id),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const print_jobs = sqliteTable('print_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sale_id: integer('sale_id').notNull().references(() => sales.id),
  invoice_number: text('invoice_number').notNull(),
  printer_name: text('printer_name'),
  print_type: text('print_type').notNull().default('thermal_80'), // 'thermal_58' | 'thermal_80' | 'a4' | 'pdf'
  status: text('status').notNull().default('pending'), // 'pending' | 'success' | 'failed'
  attempts: integer('attempts').notNull().default(0),
  error_message: text('error_message'),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  completed_at: text('completed_at'),
});

export const audit_logs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').references(() => users.id),
  username: text('username').notNull(),
  action: text('action').notNull(),
  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id'),
  details: text('details'),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const store_settings = sqliteTable('store_settings', {
  id: integer('id').primaryKey().default(1),
  store_name: text('store_name').notNull().default('Annapurna Krishi Kendra'),
  tagline: text('tagline').default('Fertilizers, Pesticides & Hybrid Seeds'),
  proprietor_name: text('proprietor_name').default('Suresh Patil'),
  address: text('address').default('Main Road, APMC Yard, Mandya'),
  mobile: text('mobile').default('9876543210'),
  email: text('email').default('annapurna.krishi@gmail.com'),
  gstin: text('gstin').default('29AAAAA0000A1Z5'),
  dl_number_1: text('dl_number_1').default('KA-MY-P12345'), // Pesticide License
  dl_number_2: text('dl_number_2').default('KA-MY-F67890'), // Fertilizer License
  state: text('state').default('Karnataka'),
  state_code: text('state_code').default('29'),
  bank_name: text('bank_name').default('State Bank of India'),
  account_number: text('account_number').default('30123456789'),
  ifsc_code: text('ifsc_code').default('SBIN0001234'),
  upi_id: text('upi_id').default('annapurna@sbi'),
  invoice_prefix: text('invoice_prefix').notNull().default('INV-'),
  default_printer: text('default_printer').default('Default Printer'),
  default_print_format: text('default_print_format').notNull().default('thermal_80'), // 'thermal_58' | 'thermal_80' | 'a4'
  auto_print_on_sale: integer('auto_print_on_sale', { mode: 'boolean' }).notNull().default(true),
  terms_and_conditions: text('terms_and_conditions').default('1. Goods once sold will not be taken back without original bill.\n2. Store seed and chemical products in cool dry place.\n3. Subject to local jurisdiction.'),
  low_stock_threshold_default: integer('low_stock_threshold_default').notNull().default(10),
  expiry_alert_days: integer('expiry_alert_days').notNull().default(60),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});
