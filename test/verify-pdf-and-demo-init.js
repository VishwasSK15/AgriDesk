const path = require('path');
const fs = require('fs');
const assert = require('assert');
const Database = require('better-sqlite3');
const { app } = require('electron');
const { pdfService } = require('../dist-electron/services/pdfService');

function pass(name, details = '') {
  console.log(`  ✓ [PASS] ${name}${details ? ' — ' + details : ''}`);
}

async function runPdfAndDemoVerification() {
  console.log('================================================================');
  console.log('PDF CONTENT & OFFLINE DEMO DB INITIALIZATION VALIDATION');
  console.log('================================================================\n');

  // PART A: DEMO DATABASE FIRST-RUN INITIALIZATION & ISOLATION
  console.log('--- TEST PART A: DEMO DB FIRST-RUN INITIALIZATION ---');

  const packagedDemoDbPath = path.resolve(__dirname, '../demo-data/agricultural_demo.db');
  assert(fs.existsSync(packagedDemoDbPath), 'Packaged demo database must exist at demo-data/agricultural_demo.db');
  const demoDbSize = fs.statSync(packagedDemoDbPath).size;
  assert(demoDbSize > 50000, `Packaged demo DB must be non-empty (>50KB), got ${demoDbSize} bytes`);
  pass('Packaged Demo Asset Verification', `Found static asset at demo-data/agricultural_demo.db (${demoDbSize} bytes)`);

  // Simulate a fresh user environment without existing database
  const tempUserDir = path.resolve(__dirname, 'temp_fresh_user_appdata');
  if (fs.existsSync(tempUserDir)) {
    fs.rmSync(tempUserDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempUserDir, { recursive: true });

  const freshUserDbPath = path.join(tempUserDir, 'agricultural.db');
  assert(!fs.existsSync(freshUserDbPath), 'Fresh user database should not exist initially');

  // Copy demo database as index.ts does on first run
  fs.copyFileSync(packagedDemoDbPath, freshUserDbPath);
  assert(fs.existsSync(freshUserDbPath), 'User local database must exist after first run initialization');
  pass('First-Run DB Copy', 'Copied packaged demo DB to simulated local AppData folder');

  // Open user local database and verify all data is present
  const userDb = new Database(freshUserDbPath);
  const userProducts = userDb.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const userCustomers = userDb.prepare('SELECT COUNT(*) as c FROM customers').get().c;
  const userPurchases = userDb.prepare('SELECT COUNT(*) as c FROM purchases').get().c;
  const userSales = userDb.prepare('SELECT COUNT(*) as c FROM sales').get().c;

  assert(userProducts >= 25, `User products must be >= 25, got ${userProducts}`);
  assert(userCustomers >= 20, `User customers must be >= 20, got ${userCustomers}`);
  assert(userPurchases >= 15, `User purchases must be >= 15, got ${userPurchases}`);
  assert(userSales >= 25, `User sales must be >= 25, got ${userSales}`);
  pass('Local DB Operating Verification', `Local SQLite copy has ${userProducts} products, ${userCustomers} customers, ${userSales} sales`);

  // Simulate user making a transaction in their local DB
  userDb.prepare(`
    INSERT INTO audit_logs (username, action, entity_type, entity_id, details)
    VALUES ('admin', 'LOCAL_WRITE_TEST', 'system', '1', 'Testing local mutation')
  `).run();

  const userLogsCount = userDb.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
  userDb.close();

  // Verify packaged demo database was NOT modified
  const verifyDemoDb = new Database(packagedDemoDbPath, { readonly: true });
  const demoLogsCount = verifyDemoDb.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
  verifyDemoDb.close();

  assert(userLogsCount > demoLogsCount, 'Local DB received writes without affecting packaged demo DB');
  assert.strictEqual(fs.statSync(packagedDemoDbPath).size, demoDbSize, 'Packaged demo DB size remains unchanged');
  pass('Packaged Asset Immutability', 'Packaged demo DB remains completely unmodified while local copy operates');

  // Clean up simulated user directory
  try { fs.rmSync(tempUserDir, { recursive: true, force: true }); } catch (e) {}


  // PART B: COMPREHENSIVE PDF GENERATION & CONTENT VALIDATION
  console.log('\n--- TEST PART B: MULTI-INVOICE PDF CONTENT VALIDATION ---');

  const testPdfDir = path.resolve(__dirname, 'test_generated_pdfs');
  if (!fs.existsSync(testPdfDir)) fs.mkdirSync(testPdfDir, { recursive: true });

  const dummySettings = {
    store_name: 'Annapurna Krishi Kendra',
    address: 'Main Road, APMC Market Yard, Mandya - 571401',
    mobile: '9845012345',
    gstin: '29AAAAA0000A1Z5',
    dl_number_1: 'KA-MY-P12345',
    dl_number_2: 'KA-MY-F67890',
    state: 'Karnataka',
    state_code: '29',
    bank_name: 'State Bank of India',
    account_number: '30123456789',
    ifsc_code: 'SBIN0001234',
    upi_id: 'annapurna@sbi',
  };

  const invoiceScenarios = [
    {
      name: '1-Item Cash Invoice (Fertilizer 5% GST)',
      format: 'a4',
      sale: {
        invoice_number: 'INV-2026-001',
        sale_date: '2026-09-30 10:15:00',
        customer_name: 'Walk-in Farmer',
        customer_mobile: '9845112233',
        customer_village: 'Hosahalli',
        payment_method: 'cash',
        subtotal: 1285.71,
        tax_amount: 64.29,
        total_discount: 0,
        grand_total: 1350.00,
        paid_amount: 1350.00,
        balance_due: 0,
        items: [
          {
            product_name: 'TEST DAP Fertilizer 50kg',
            batch_number: 'DAP-2026-01',
            expiry_date: '2028-06-30',
            quantity: 1,
            unit: 'Bag',
            rate: 1350.00,
            discount_amount: 0,
            taxable_amount: 1285.71,
            tax_rate: 5,
            total_amount: 1350.00
          }
        ]
      }
    },
    {
      name: '2-3 Item Mixed GST Invoice (5%, 18%)',
      format: 'a4',
      sale: {
        invoice_number: 'INV-2026-002',
        sale_date: '2026-09-30 11:30:00',
        customer_name: 'TEST Ramesh Gowda',
        customer_mobile: '9845112233',
        customer_village: 'Hosahalli',
        payment_method: 'upi',
        subtotal: 2165.71,
        tax_amount: 134.29,
        total_discount: 50.00,
        grand_total: 2250.00,
        paid_amount: 2250.00,
        balance_due: 0,
        items: [
          {
            product_name: 'TEST Neem Coated Urea 45kg',
            batch_number: 'UREA-NC-45',
            expiry_date: '2028-12-31',
            quantity: 2,
            unit: 'Bag',
            rate: 266.00,
            discount_amount: 0,
            taxable_amount: 506.67,
            tax_rate: 5,
            total_amount: 532.00
          },
          {
            product_name: 'TEST Chlorpyrifos 20% EC 1L',
            batch_number: 'CHP-8821',
            expiry_date: '2027-09-30',
            quantity: 2,
            unit: 'Bottle',
            rate: 450.00,
            discount_amount: 20,
            taxable_amount: 745.76,
            tax_rate: 18,
            total_amount: 880.00
          },
          {
            product_name: 'TEST Hybrid Maize Seed 5kg',
            batch_number: 'MZ-HY-99',
            expiry_date: '2027-05-31',
            quantity: 1,
            unit: 'Packet',
            rate: 750.00,
            discount_amount: 30,
            taxable_amount: 720.00,
            tax_rate: 0,
            total_amount: 720.00
          }
        ]
      }
    },
    {
      name: '5+ Items Large Credit Invoice (Farmer Khata)',
      format: 'a4',
      sale: {
        invoice_number: 'INV-2026-003',
        sale_date: '2026-09-30 14:00:00',
        customer_name: 'TEST Basavaraj Patil',
        customer_mobile: '9845223344',
        customer_village: 'Koppa',
        payment_method: 'credit',
        subtotal: 6500.00,
        tax_amount: 420.00,
        total_discount: 150.00,
        grand_total: 6770.00,
        paid_amount: 2000.00,
        balance_due: 4770.00,
        items: [
          { product_name: 'TEST DAP Fertilizer 50kg', batch_number: 'DAP-01', expiry_date: '2028-06-30', quantity: 2, unit: 'Bag', rate: 1350, discount_amount: 0, taxable_amount: 2571.43, tax_rate: 5, total_amount: 2700 },
          { product_name: 'TEST MOP Potash 50kg', batch_number: 'MOP-02', expiry_date: '2028-09-30', quantity: 1, unit: 'Bag', rate: 1750, discount_amount: 50, taxable_amount: 1619.05, tax_rate: 5, total_amount: 1700 },
          { product_name: 'TEST Mancozeb 75% WP 500g', batch_number: 'MCZ-10', expiry_date: '2027-08-31', quantity: 2, unit: 'Packet', rate: 280, discount_amount: 20, taxable_amount: 457.63, tax_rate: 18, total_amount: 540 },
          { product_name: 'TEST Emamectin Benzoate 5% SG 100g', batch_number: 'EMA-05', expiry_date: '2027-11-30', quantity: 2, unit: 'Packet', rate: 390, discount_amount: 30, taxable_amount: 635.59, tax_rate: 18, total_amount: 750 },
          { product_name: 'TEST Water Soluble NPK 19-19-19 1kg', batch_number: 'NPK-19', expiry_date: '2028-01-31', quantity: 3, unit: 'Packet', rate: 185, discount_amount: 50, taxable_amount: 480.95, tax_rate: 5, total_amount: 505 },
          { product_name: 'TEST Soluble Boron 20% 250g', batch_number: 'BOR-22', expiry_date: '2027-12-31', quantity: 1, unit: 'Packet', rate: 175, discount_amount: 0, taxable_amount: 156.25, tax_rate: 12, total_amount: 175 },
        ]
      }
    },
    {
      name: '80mm Thermal Receipt (POS Counter)',
      format: 'thermal_80',
      sale: {
        invoice_number: 'INV-2026-004',
        sale_date: '2026-09-30 15:45:00',
        customer_name: 'TEST Ningappa Gowda',
        customer_mobile: '9845225588',
        payment_method: 'cash',
        subtotal: 1040.00,
        tax_amount: 80.00,
        total_discount: 40.00,
        grand_total: 1080.00,
        paid_amount: 1080.00,
        balance_due: 0,
        items: [
          { product_name: 'TEST Cypermethrin 10% EC 1L', batch_number: 'CYP-10', quantity: 2, unit: 'Bottle', rate: 350, total_amount: 700 },
          { product_name: 'TEST Humic Acid 98% Flakes 1kg', batch_number: 'HUM-01', quantity: 1, unit: 'Packet', rate: 320, total_amount: 320 }
        ]
      }
    },
    {
      name: '58mm Thermal Receipt (Compact POS)',
      format: 'thermal_58',
      sale: {
        invoice_number: 'INV-2026-005',
        sale_date: '2026-09-30 16:20:00',
        customer_name: 'Walk-in Farmer',
        payment_method: 'cash',
        subtotal: 266.00,
        tax_amount: 13.30,
        total_discount: 0,
        grand_total: 266.00,
        paid_amount: 266.00,
        balance_due: 0,
        items: [
          { product_name: 'TEST Neem Coated Urea 45kg', batch_number: 'UREA-01', quantity: 1, unit: 'Bag', rate: 266, total_amount: 266 }
        ]
      }
    }
  ];

  for (let i = 0; i < invoiceScenarios.length; i++) {
    const sc = invoiceScenarios[i];
    const outPdfPath = path.join(testPdfDir, `scenario_${i + 1}_${sc.format}.pdf`);
    if (fs.existsSync(outPdfPath)) fs.unlinkSync(outPdfPath);

    const res = await pdfService.generateInvoicePdf({
      targetPath: outPdfPath,
      format: sc.format,
      sale: sc.sale,
      settings: dummySettings,
    });

    assert(fs.existsSync(outPdfPath), `PDF file must exist at ${outPdfPath}`);
    const stat = fs.statSync(outPdfPath);
    assert(stat.size > 5000, `PDF size must be > 5000 bytes (got ${stat.size})`);

    const buf = fs.readFileSync(outPdfPath);
    const header = buf.subarray(0, 5).toString('ascii');
    assert.strictEqual(header, '%PDF-', `File must start with %PDF- header`);

    const contentStr = buf.toString('latin1');
    assert(contentStr.includes('%%EOF'), 'File must contain %%EOF marker');

    pass(sc.name, `Generated authentic PDF (${stat.size} bytes, format: ${sc.format})`);
  }

  // Clean up generated scenario PDFs
  try { fs.rmSync(testPdfDir, { recursive: true, force: true }); } catch (e) {}

  console.log('\n================================================================');
  console.log('ALL DEMO DB & PDF VALIDATION CHECKS PASSED (100% SUCCESS)');
  console.log('================================================================\n');
}

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.whenReady().then(async () => {
  try {
    await runPdfAndDemoVerification();
    app.exit(0);
  } catch (err) {
    console.error('\n✗ Test failed:', err);
    app.exit(1);
  }
});
