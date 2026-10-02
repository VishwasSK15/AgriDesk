const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { app } = require('electron');
const { pdfService } = require('../dist-electron/services/pdfService');

function getPdfPageCount(buffer) {
  const str = buffer.toString('latin1');
  const matches = str.match(/\/Type\s*\/Page\b[^s]/g);
  return matches ? matches.length : 0;
}

function pass(name, details = '') {
  console.log(`  ✓ [PASS] ${name}${details ? ' — ' + details : ''}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('AGRIDESK PDF / INVOICE REPAIR & PAGINATION TEST SUITE');
  console.log('================================================================\n');

  const outDir = path.resolve(__dirname, 'test_generated_pdfs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const dummySettings = {
    store_name: 'Annapurna Krishi Kendra',
    tagline: 'Fertilizers, Pesticides & Hybrid Seeds',
    address: 'Main Road, APMC Yard, Mandya - 571401',
    mobile: '9845012345',
    email: 'annapurna.krishi@gmail.com',
    gstin: '29AAAAA0000A1Z5',
    dl_number_1: 'KA-MY-P12345',
    dl_number_2: 'KA-MY-F67890',
    state: 'Karnataka',
    state_code: '29',
    bank_name: 'State Bank of India',
    account_number: '30123456789',
    ifsc_code: 'SBIN0001234',
    upi_id: 'annapurna@sbi',
    terms_and_conditions: '1. Goods once sold will not be returned without original invoice.\n2. Store seed and chemical products in cool dry place.\n3. Subject to local jurisdiction.',
  };

  // TEST 1: INVOICE-INV-2026-0051 (1-Item Urea Invoice)
  console.log('--- TEST 1: REFERENCE INVOICE INV-2026-0051 (1 ITEM) ---');
  const inv51Sale = {
    invoice_number: 'INV-2026-0051',
    sale_date: '2026-09-30 13:29:17',
    customer_name: 'Walk-in Customer',
    customer_mobile: '0000000000',
    customer_village: 'Local',
    customer_address: 'Local Counter',
    payment_method: 'cash',
    subtotal: 266.00,
    total_discount: 0,
    tax_amount: 13.30,
    round_off: -0.30,
    grand_total: 279.00,
    paid_amount: 279.00,
    balance_due: 0,
    items: [
      {
        product_name: 'TEST Neem Coated Urea 45kg',
        batch_number: 'BAT-UREA-02',
        expiry_date: '2029-01-01',
        quantity: 1,
        unit: 'Bag',
        rate: 266.00,
        discount_amount: 0,
        tax_rate: 5,
        taxable_amount: 266.00,
        tax_amount: 13.30,
        total_amount: 279.30,
      }
    ]
  };

  const pdf51Path = path.join(outDir, 'INV-2026-0051_a4.pdf');
  const res51 = await pdfService.generateInvoicePdf({
    targetPath: pdf51Path,
    format: 'a4',
    sale: inv51Sale,
    settings: dummySettings,
  });

  assert(fs.existsSync(pdf51Path), 'INV-2026-0051 PDF must be written to disk');
  const buf51 = fs.readFileSync(pdf51Path);
  assert(buf51.subarray(0, 5).toString('ascii') === '%PDF-', 'Must start with %PDF-');
  assert(buf51.toString('latin1').includes('%%EOF'), 'Must contain %%EOF');

  const pages51 = getPdfPageCount(buf51);
  console.log(`  Page count for 1-item invoice: ${pages51}`);
  assert.strictEqual(pages51, 1, `1-item invoice MUST fit on exactly 1 page (got ${pages51})`);
  pass('INV-2026-0051 1-Page Layout', `Rendered on exactly 1 page (${buf51.length} bytes)`);

  // Verify regression values in HTML
  const html51 = pdfService.buildInvoiceHtml(inv51Sale, dummySettings, 'a4');
  assert(html51.includes('₹266.00'), 'Contains taxable value ₹266.00');
  assert(html51.includes('₹6.65'), 'Contains CGST and SGST ₹6.65');
  assert(html51.includes('-₹0.30'), 'Contains Round Off -₹0.30');
  assert(html51.includes('₹279.00'), 'Contains Grand Total and Paid Amount ₹279.00');
  assert(html51.includes('3102'), 'Contains HSN 3102 for Urea');
  assert(html51.includes('BAT-UREA-02'), 'Contains batch BAT-UREA-02');
  assert(html51.includes('2029-01'), 'Contains expiry 2029-01');
  pass('INV-2026-0051 Content Regression', 'All tax, grand total, HSN, batch, and expiry values verified');

  // TEST 2: 3-ITEM INVOICE
  console.log('\n--- TEST 2: 3-ITEM INVOICE ---');
  const sale3 = {
    invoice_number: 'INV-2026-0052',
    sale_date: '2026-10-02 11:00:00',
    customer_name: 'TEST Ramesh Gowda',
    customer_mobile: '9845112233',
    customer_village: 'Hosahalli',
    customer_address: 'Hosahalli Post, Mandya',
    payment_method: 'upi',
    subtotal: 2165.71,
    total_discount: 50.00,
    tax_amount: 134.29,
    round_off: 0.00,
    grand_total: 2250.00,
    paid_amount: 2250.00,
    balance_due: 0,
    items: [
      { product_name: 'TEST Neem Coated Urea 45kg', batch_number: 'BAT-UREA-02', expiry_date: '2029-01-01', quantity: 2, unit: 'Bag', rate: 266, discount_amount: 0, tax_rate: 5, taxable_amount: 506.67, tax_amount: 25.33, total_amount: 532 },
      { product_name: 'TEST Chlorpyrifos 20% EC 1L', batch_number: 'BAT-CHP-01', expiry_date: '2028-06-30', quantity: 2, unit: 'Bottle', rate: 450, discount_amount: 20, tax_rate: 18, taxable_amount: 745.76, tax_amount: 134.24, total_amount: 880 },
      { product_name: 'TEST Hybrid Maize Seed 5kg', batch_number: 'BAT-MZ-05', expiry_date: '2027-12-31', quantity: 1, unit: 'Packet', rate: 750, discount_amount: 30, tax_rate: 0, taxable_amount: 720.00, tax_amount: 0, total_amount: 720 },
    ]
  };

  const pdf3Path = path.join(outDir, 'INV-2026-0052_3items_a4.pdf');
  await pdfService.generateInvoicePdf({
    targetPath: pdf3Path,
    format: 'a4',
    sale: sale3,
    settings: dummySettings,
  });

  const buf3 = fs.readFileSync(pdf3Path);
  const pages3 = getPdfPageCount(buf3);
  console.log(`  Page count for 3-item invoice: ${pages3}`);
  assert.strictEqual(pages3, 1, `3-item invoice MUST fit on exactly 1 page (got ${pages3})`);
  pass('3-Item Invoice 1-Page Layout', `Rendered on exactly 1 page (${buf3.length} bytes)`);

  // TEST 3: 6-ITEM INVOICE
  console.log('\n--- TEST 3: 6-ITEM INVOICE ---');
  const sale6 = {
    invoice_number: 'INV-2026-0053',
    sale_date: '2026-10-02 12:00:00',
    customer_name: 'TEST Basavaraj Patil',
    customer_mobile: '9845223344',
    customer_village: 'Koppa',
    payment_method: 'credit',
    subtotal: 6500.00,
    total_discount: 150.00,
    tax_amount: 420.00,
    round_off: 0.00,
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
  };

  const pdf6Path = path.join(outDir, 'INV-2026-0053_6items_a4.pdf');
  await pdfService.generateInvoicePdf({
    targetPath: pdf6Path,
    format: 'a4',
    sale: sale6,
    settings: dummySettings,
  });

  const buf6 = fs.readFileSync(pdf6Path);
  const pages6 = getPdfPageCount(buf6);
  console.log(`  Page count for 6-item invoice: ${pages6}`);
  assert.strictEqual(pages6, 1, `6-item invoice MUST fit on exactly 1 page (got ${pages6})`);
  pass('6-Item Invoice 1-Page Layout', `Rendered on exactly 1 page (${buf6.length} bytes)`);

  // TEST 4: MULTI-PAGE LONG INVOICE (20 ITEMS)
  console.log('\n--- TEST 4: MULTI-PAGE LONG INVOICE (20 ITEMS) ---');
  const longItems = [];
  for (let i = 1; i <= 20; i++) {
    longItems.push({
      product_name: `Agricultural Supply Item ${i} - Standard Pack`,
      batch_number: `BAT-GEN-${i}`,
      expiry_date: `2028-12-31`,
      quantity: 2,
      unit: 'Bag',
      rate: 500,
      discount_amount: 10,
      tax_rate: 5,
      taxable_amount: 942.86,
      tax_amount: 47.14,
      total_amount: 990,
    });
  }

  const saleLong = {
    invoice_number: 'INV-2026-0054-LONG',
    sale_date: '2026-10-02 14:00:00',
    customer_name: 'TEST Estate Commercial Buyer',
    customer_mobile: '9845999999',
    customer_village: 'Koppa Farm',
    payment_method: 'bank_transfer',
    subtotal: 19800.00,
    total_discount: 200.00,
    tax_amount: 942.80,
    round_off: 0.00,
    grand_total: 19800.00,
    paid_amount: 19800.00,
    balance_due: 0,
    items: longItems,
  };

  const pdfLongPath = path.join(outDir, 'INV-2026-0054_long_a4.pdf');
  await pdfService.generateInvoicePdf({
    targetPath: pdfLongPath,
    format: 'a4',
    sale: saleLong,
    settings: dummySettings,
  });

  const bufLong = fs.readFileSync(pdfLongPath);
  const pagesLong = getPdfPageCount(bufLong);
  console.log(`  Page count for 20-item invoice: ${pagesLong}`);
  assert(pagesLong >= 2, `20-item invoice should naturally paginate across multiple pages (got ${pagesLong})`);
  pass('Long Invoice Sensible Multi-Page Pagination', `Naturally paginated into ${pagesLong} pages (${bufLong.length} bytes)`);

  // TEST 5: THERMAL 80mm & THERMAL 58mm
  console.log('\n--- TEST 5: THERMAL 80mm & 58mm FORMATS ---');
  const pdf80Path = path.join(outDir, 'INV-2026-0051_thermal80.pdf');
  await pdfService.generateInvoicePdf({
    targetPath: pdf80Path,
    format: 'thermal_80',
    sale: inv51Sale,
    settings: dummySettings,
  });
  const buf80 = fs.readFileSync(pdf80Path);
  assert(buf80.subarray(0, 5).toString('ascii') === '%PDF-', '80mm must start with %PDF-');
  assert(buf80.toString('latin1').includes('%%EOF'), '80mm must contain %%EOF');
  pass('80mm Thermal Receipt Generation', `Valid binary PDF created (${buf80.length} bytes)`);

  const pdf58Path = path.join(outDir, 'INV-2026-0051_thermal58.pdf');
  await pdfService.generateInvoicePdf({
    targetPath: pdf58Path,
    format: 'thermal_58',
    sale: inv51Sale,
    settings: dummySettings,
  });
  const buf58 = fs.readFileSync(pdf58Path);
  assert(buf58.subarray(0, 5).toString('ascii') === '%PDF-', '58mm must start with %PDF-');
  assert(buf58.toString('latin1').includes('%%EOF'), '58mm must contain %%EOF');
  pass('58mm Thermal Receipt Generation', `Valid binary PDF created (${buf58.length} bytes)`);

  // Clean up test PDFs
  try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (e) {}

  console.log('\n================================================================');
  console.log('ALL PDF FORMATTING & PAGINATION TESTS PASSED (100% SUCCESS)');
  console.log('================================================================\n');
}

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.whenReady().then(async () => {
  try {
    await runTests();
    app.exit(0);
  } catch (err) {
    console.error('\n✗ Test failed:', err);
    app.exit(1);
  }
});
