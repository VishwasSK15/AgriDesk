const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const demoDir = path.resolve(__dirname, '../demo-data');
if (!fs.existsSync(demoDir)) {
  fs.mkdirSync(demoDir, { recursive: true });
}

const targetPath = path.join(demoDir, 'agricultural_demo.db');
if (fs.existsSync(targetPath)) {
  fs.unlinkSync(targetPath);
}

const qaDbPath = path.join(process.env.APPDATA, 'AgriculturalBilling-QA', 'agricultural_qa.db');
const db = new Database(qaDbPath, { readonly: true });

// Use VACUUM INTO to create clean standalone demo SQLite DB
const vacuumSql = `VACUUM INTO '${targetPath.replace(/\\/g, '/')}'`;
console.log('Running:', vacuumSql);
db.exec(vacuumSql);
db.close();

console.log('Successfully created demo database at:', targetPath);
console.log('File size (bytes):', fs.statSync(targetPath).size);

// Verify newly created demo DB
const demoDb = new Database(targetPath, { readonly: true });
const tables = [
  'users',
  'customers',
  'suppliers',
  'products',
  'batches',
  'purchases',
  'purchase_items',
  'sales',
  'sale_items',
  'payments',
  'stock_movements',
  'print_jobs',
  'audit_logs',
  'store_settings'
];

console.log('\n--- Demo Database Verification ---');
for (const t of tables) {
  const row = demoDb.prepare(`SELECT count(*) as c FROM ${t}`).get();
  console.log(`${t.padEnd(20)}: ${row.c}`);
}
demoDb.close();
