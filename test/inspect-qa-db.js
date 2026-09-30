const Database = require('better-sqlite3');
const path = require('path');

const qaDbPath = path.join(process.env.APPDATA, 'AgriculturalBilling-QA', 'agricultural_qa.db');
const db = new Database(qaDbPath, { readonly: true });

const tables = [
  'products',
  'batches',
  'customers',
  'suppliers',
  'purchases',
  'purchase_items',
  'sales',
  'sale_items',
  'payments',
  'stock_movements',
  'print_jobs',
  'audit_logs'
];

console.log('QA DATABASE INSPECTION:');
console.log('Location:', qaDbPath);
console.log('-------------------------------------------');
for (const t of tables) {
  const row = db.prepare(`SELECT count(*) as count FROM ${t}`).get();
  console.log(`${t.padEnd(20)}: ${row.count}`);
}

console.log('\nSAMPLE SALES INVOICES:');
const sales = db.prepare('SELECT invoice_number, customer_name, grand_total, payment_method, paid_amount, balance_due, print_status, print_count FROM sales').all();
console.table(sales);

console.log('\nSAMPLE PRODUCTS & CURRENT STOCK:');
const prods = db.prepare('SELECT name, category, current_stock, unit, selling_rate FROM products').all();
console.table(prods);

console.log('\nSAMPLE CUSTOMERS & BALANCES:');
const custs = db.prepare('SELECT name, mobile, village, credit_limit, outstanding_balance FROM customers WHERE name != \'Walk-in Customer\'').all();
console.table(custs);

db.close();
