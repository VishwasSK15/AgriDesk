import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}

// Database location
const isQA = process.env.AGRI_ENV === 'qa' || process.env.NODE_ENV === 'test-qa';
const dbDir = isQA
  ? path.resolve(process.env.APPDATA ? path.join(process.env.APPDATA, 'AgriculturalBilling-QA') : path.join(__dirname, '../../data-qa'))
  : path.resolve(process.env.APPDATA ? path.join(process.env.APPDATA, 'AgriculturalBilling') : path.join(__dirname, '../../data'));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const dbPath = process.env.AGRI_DB_PATH || path.join(dbDir, isQA ? 'agricultural_qa.db' : 'agricultural.db');

// First-run initialization: Copy packaged offline demo database if user has no existing database
if (!isQA && !fs.existsSync(dbPath)) {
  const candidateDemoPaths = [
    path.resolve(__dirname, '../../demo-data/agricultural_demo.db'),
    path.resolve(__dirname, '../demo-data/agricultural_demo.db'),
    path.resolve(process.cwd(), 'demo-data/agricultural_demo.db'),
  ];
  const demoSource = candidateDemoPaths.find((p) => fs.existsSync(p));
  if (demoSource) {
    try {
      fs.copyFileSync(demoSource, dbPath);
      console.log(`[AgriStore DB] Initialized user local database at ${dbPath} from packaged asset.`);
    } catch (err) {
      console.error('[AgriStore DB] Failed to initialize demo database copy:', err);
    }
  }
}

export const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Initialize database tables if not already created
export function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      alternate_mobile TEXT,
      address TEXT,
      village TEXT,
      taluk TEXT,
      district TEXT,
      state TEXT DEFAULT 'Karnataka',
      pincode TEXT,
      gstin TEXT,
      farm_name TEXT,
      farm_size TEXT,
      crop_info TEXT,
      outstanding_balance REAL NOT NULL DEFAULT 0,
      credit_limit REAL NOT NULL DEFAULT 50000,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      address TEXT,
      gstin TEXT,
      license_info TEXT,
      payment_terms TEXT,
      outstanding_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT,
      category TEXT NOT NULL,
      subcategory TEXT,
      brand TEXT,
      manufacturer TEXT,
      unit TEXT NOT NULL DEFAULT 'Bag',
      hsn_sac TEXT,
      purchase_rate REAL NOT NULL DEFAULT 0,
      selling_rate REAL NOT NULL DEFAULT 0,
      mrp REAL NOT NULL DEFAULT 0,
      default_discount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      current_stock REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 10,
      max_stock REAL NOT NULL DEFAULT 1000,
      active_ingredient TEXT,
      pack_size TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      batch_number TEXT NOT NULL,
      mfg_date TEXT,
      expiry_date TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      purchase_rate REAL NOT NULL DEFAULT 0,
      mrp REAL NOT NULL DEFAULT 0,
      selling_rate REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      customer_mobile TEXT,
      customer_address TEXT,
      customer_gstin TEXT,
      customer_village TEXT,
      sale_date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'fixed',
      discount_value REAL NOT NULL DEFAULT 0,
      total_discount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL,
      round_off REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      paid_amount REAL NOT NULL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      print_status TEXT NOT NULL DEFAULT 'pending',
      print_count INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      batch_id INTEGER REFERENCES batches(id),
      product_name TEXT NOT NULL,
      batch_number TEXT,
      expiry_date TEXT,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      rate REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      taxable_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
      supplier_name TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'paid',
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      batch_number TEXT NOT NULL,
      mfg_date TEXT,
      expiry_date TEXT,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      purchase_rate REAL NOT NULL,
      mrp REAL NOT NULL,
      selling_rate REAL NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      sale_id INTEGER REFERENCES sales(id),
      purchase_id INTEGER REFERENCES purchases(id),
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      reference_number TEXT,
      notes TEXT,
      payment_date TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      batch_id INTEGER REFERENCES batches(id),
      product_name TEXT,
      batch_number TEXT,
      quantity_change REAL NOT NULL,
      movement_type TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      reason TEXT,
      previous_stock REAL NOT NULL,
      new_stock REAL NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS print_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL,
      printer_name TEXT,
      print_type TEXT NOT NULL DEFAULT 'thermal_80',
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      store_name TEXT NOT NULL DEFAULT 'Annapurna Krishi Kendra',
      tagline TEXT DEFAULT 'Fertilizers, Pesticides & Hybrid Seeds',
      proprietor_name TEXT DEFAULT 'Suresh Patil',
      address TEXT DEFAULT 'Main Road, APMC Yard, Mandya',
      mobile TEXT DEFAULT '9876543210',
      email TEXT DEFAULT 'annapurna.krishi@gmail.com',
      gstin TEXT DEFAULT '29AAAAA0000A1Z5',
      dl_number_1 TEXT DEFAULT 'KA-MY-P12345',
      dl_number_2 TEXT DEFAULT 'KA-MY-F67890',
      state TEXT DEFAULT 'Karnataka',
      state_code TEXT DEFAULT '29',
      bank_name TEXT DEFAULT 'State Bank of India',
      account_number TEXT DEFAULT '30123456789',
      ifsc_code TEXT DEFAULT 'SBIN0001234',
      upi_id TEXT DEFAULT 'annapurna@sbi',
      invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
      default_printer TEXT DEFAULT 'Default Printer',
      default_print_format TEXT NOT NULL DEFAULT 'thermal_80',
      auto_print_on_sale INTEGER NOT NULL DEFAULT 1,
      terms_and_conditions TEXT DEFAULT '1. Goods once sold will not be taken back without original bill.\n2. Store seed and chemical products in cool dry place.\n3. Subject to local jurisdiction.',
      low_stock_threshold_default INTEGER NOT NULL DEFAULT 10,
      expiry_alert_days INTEGER NOT NULL DEFAULT 60,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Indexes for high-speed counter billing and search
    CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_batches_product_id ON batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON stock_movements(product_id);
  `);

  // Seed default admin user if none exists
  const existingUser = sqlite.prepare('SELECT id FROM users LIMIT 1').get();
  if (!existingUser) {
    const adminPassHash = hashPassword('admin123');
    const staffPassHash = hashPassword('staff123');
    sqlite.prepare(`
      INSERT INTO users (username, name, role, password_hash)
      VALUES (?, ?, ?, ?), (?, ?, ?, ?)
    `).run('admin', 'Store Admin', 'admin', adminPassHash, 'staff', 'Billing Counter', 'staff', staffPassHash);
  }

  // Seed default store settings if none exists
  const existingSettings = sqlite.prepare('SELECT id FROM store_settings WHERE id = 1').get();
  if (!existingSettings) {
    sqlite.prepare(`
      INSERT INTO store_settings (id, store_name, tagline, proprietor_name, address, mobile, email, gstin, dl_number_1, dl_number_2, default_print_format)
      VALUES (1, 'Annapurna Krishi Kendra', 'Fertilizers, Pesticides & Hybrid Seeds', 'Suresh Patil', 'Main Road, APMC Yard, Mandya', '9876543210', 'annapurna.krishi@gmail.com', '29AAAAA0000A1Z5', 'KA-MY-P12345', 'KA-MY-F67890', 'thermal_80')
    `).run();
  }

  // Seed walk-in customer if none exists
  const walkIn = sqlite.prepare('SELECT id FROM customers WHERE id = 1').get();
  if (!walkIn) {
    sqlite.prepare(`
      INSERT INTO customers (id, name, mobile, address, village, outstanding_balance, credit_limit)
      VALUES (1, 'Walk-in Customer', '0000000000', 'Local Counter', 'Local', 0, 0)
    `).run();
  }

  // Seed sample supplier and realistic agricultural products with batches if empty and not in QA mode
  if (!isQA) {
    const prodCount = (sqlite.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
    if (prodCount === 0) {
      seedInitialAgriculturalData();
    }
  }
}

function seedInitialAgriculturalData() {
  const insertSupplier = sqlite.prepare(`
    INSERT INTO suppliers (name, mobile, email, address, gstin, license_info, payment_terms, outstanding_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const s1 = insertSupplier.run('IFFCO Fertilizers Ltd', '9845012345', 'iffco.mandya@iffco.in', 'Industrial Area, Mysore', '29AAACI1234F1Z1', 'FERT-DIST-2024-88', '30 Days Net', 0);
  const s2 = insertSupplier.run('Bayer CropScience India', '9845056789', 'bayer.order@bayer.com', 'APMC Block B, Bengaluru', '29AABCB5678K1Z2', 'PEST-MFG-9981', '15 Days Net', 0);
  const s3 = insertSupplier.run('Mahyco Seeds Pvt Ltd', '9845099999', 'mahyco@mahyco.com', 'Jalna Agro Complex', '27AABCM3344M1Z9', 'SEED-CERT-4412', 'Immediate', 0);

  const insertProduct = sqlite.prepare(`
    INSERT INTO products (name, sku, barcode, category, subcategory, brand, manufacturer, unit, hsn_sac, purchase_rate, selling_rate, mrp, tax_rate, current_stock, min_stock, active_ingredient, pack_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBatch = sqlite.prepare(`
    INSERT INTO batches (product_id, batch_number, mfg_date, expiry_date, quantity, purchase_rate, mrp, selling_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Urea 45kg Bag (Fertilizer)
  const p1 = insertProduct.run('Neem Coated Urea (45kg)', 'FERT-UREA-45', '8901234567890', 'Fertilizers', 'Nitrogenous', 'IFFCO', 'IFFCO', 'Bag', '31021000', 242, 268, 268, 5, 120, 25, 'Nitrogen 46%', '45 kg');
  insertBatch.run(p1.lastInsertRowid, 'IFF-U24-801', '2026-01-10', '2028-01-10', 120, 242, 268, 268);

  // 2. DAP 50kg Bag (Fertilizer)
  const p2 = insertProduct.run('DAP 18:46:0 (50kg)', 'FERT-DAP-50', '8901234567891', 'Fertilizers', 'Phosphatic', 'IFFCO', 'IFFCO', 'Bag', '31053000', 1280, 1350, 1350, 5, 80, 20, 'N 18% + P 46%', '50 kg');
  insertBatch.run(p2.lastInsertRowid, 'IFF-DAP-102', '2026-02-15', '2028-02-15', 80, 1280, 1350, 1350);

  // 3. Chlorpyrifos 20% EC 1L (Pesticide / Insecticide)
  const p3 = insertProduct.run('Chlorpyrifos 20% EC (1 Litre)', 'PEST-CHL-1L', '8901234567892', 'Pesticides', 'Insecticides', 'Bayer', 'Bayer CropScience', 'Litre', '38089199', 380, 480, 520, 18, 45, 10, 'Chlorpyrifos 20% EC', '1 Litre');
  insertBatch.run(p3.lastInsertRowid, 'BAY-CH-2026A', '2025-06-01', '2027-05-31', 45, 380, 520, 480);

  // 4. Glyphosate 41% SL 1L (Herbicide / Weedicide)
  const p4 = insertProduct.run('Roundup Glyphosate 41% SL (1L)', 'PEST-GLY-1L', '8901234567893', 'Pesticides', 'Herbicides', 'Bayer', 'Bayer CropScience', 'Litre', '38089340', 420, 530, 580, 18, 8, 15, 'Glyphosate 41% IPA Salt', '1 Litre'); // Low stock for demo
  insertBatch.run(p4.lastInsertRowid, 'BAY-GL-552', '2025-03-01', '2026-11-30', 8, 420, 580, 530); // Approaching expiry in 60 days

  // 5. Mancozeb 75% WP 500g (Fungicide)
  const p5 = insertProduct.run('Mancozeb 75% WP (500g)', 'PEST-MAN-500', '8901234567894', 'Pesticides', 'Fungicides', 'Indofil', 'Indofil Industries', 'Packet', '38089210', 180, 240, 260, 18, 60, 12, 'Mancozeb 75% WP', '500 g');
  insertBatch.run(p5.lastInsertRowid, 'IND-MAN-901', '2025-08-10', '2027-08-10', 60, 180, 260, 240);

  // 6. Hybrid Tomato Seeds Abhinav 10g (Seeds)
  const p6 = insertProduct.run('Abhinav Hybrid Tomato Seeds (10g)', 'SEED-TOM-10G', '8901234567895', 'Seeds', 'Vegetable Seeds', 'Mahyco', 'Mahyco Seeds', 'Packet', '12099190', 620, 750, 790, 0, 35, 10, 'F1 Hybrid Solanum lycopersicum', '10 g');
  insertBatch.run(p6.lastInsertRowid, 'MAH-TOM-2026', '2026-01-01', '2026-10-15', 35, 620, 790, 750); // Approaching expiry in ~17 days

  // 7. Zinc Sulphate 21% 5kg (Crop Nutrition)
  const p7 = insertProduct.run('Zinc Sulphate Heptahydrate 21% (5kg)', 'NUT-ZN-5KG', '8901234567896', 'Crop Nutrition', 'Micronutrients', 'Multiplex', 'Karnataka Agro Chemicals', 'Bag', '28332990', 210, 290, 320, 12, 50, 10, 'Zn 21%, S 10%', '5 kg');
  insertBatch.run(p7.lastInsertRowid, 'MUL-ZN-331', '2025-11-01', '2028-11-01', 50, 210, 320, 290);

  // 8. 16L Battery Knapsack Sprayer (Hardware/Tools)
  const p8 = insertProduct.run('16L 12V Battery Sprayer Pump', 'TOOL-SP-16L', '8901234567897', 'Hardware/Tools', 'Sprayers', 'KisanKraft', 'KisanKraft Ltd', 'Piece', '84244100', 2100, 2750, 3100, 18, 6, 2, '12V 12Ah Battery with brass lance', '1 Unit');
  insertBatch.run(p8.lastInsertRowid, 'KK-SP-2026-4', '2026-01-01', '2030-01-01', 6, 2100, 3100, 2750);

  // Add sample local farmers / customers
  const insertCustomer = sqlite.prepare(`
    INSERT INTO customers (name, mobile, address, village, taluk, district, gstin, farm_name, farm_size, crop_info, outstanding_balance, credit_limit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCustomer.run('Ramesh Gowda', '9845112233', 'Near Temple, Keregodu', 'Keregodu', 'Mandya', 'Mandya', '', 'Gowda Farms', '4.5 Acres', 'Sugarcane, Paddy', 3500, 40000);
  insertCustomer.run('Shivanna Patel', '9845223344', 'Opp Dairy, Dudda', 'Dudda', 'Mandya', 'Mandya', '', 'Patel Krishi Farm', '6 Acres', 'Paddy, Tomato, Ragi', 0, 50000);
  insertCustomer.run('Anand Kumar', '9845334455', 'B.G. Nagar Road, Nagamangala', 'Bellur', 'Nagamangala', 'Mandya', '29ABCDE1234F1Z5', 'Sri Lakshmi Nursery', '10 Acres', 'Banana, Arecanut, Vegetables', 8200, 75000);
}
