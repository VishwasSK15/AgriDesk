const path = require('path');
const dist = (rel) => path.resolve(__dirname, '../dist-electron', rel);
const { initDatabase, sqlite, dbPath } = require(dist('db/index'));
const { authService } = require(dist('services/authService'));
const { billingService } = require(dist('services/billingService'));
const { inventoryService } = require(dist('services/inventoryService'));
const { customerService } = require(dist('services/customerService'));
const { supplierService } = require(dist('services/supplierService'));
const { purchaseService } = require(dist('services/purchaseService'));
const { printingService } = require(dist('services/printingService'));
const { reportService } = require(dist('services/reportService'));
const { insightService } = require(dist('services/insightService'));
const { backupService } = require(dist('services/backupService'));
const { settingsService } = require(dist('services/settingsService'));
const assert = require('assert');
const fs = require('fs');

console.log('====================================================');
console.log('RUNNING AGRI-STORE FULL WORKFLOW INTEGRATION TEST');
console.log('====================================================\n');

// 1. Initialize Database
initDatabase();
console.log('✓ Database initialized at:', dbPath);

// 2. Authentication Test
console.log('\n--- 1. Testing Authentication & User Roles ---');
const adminLogin = authService.login('admin', 'admin123');
assert.strictEqual(adminLogin.success, true, 'Admin login should succeed');
assert.strictEqual(adminLogin.user.role, 'admin', 'Admin role should be admin');
console.log('✓ Admin login verified');

const badLogin = authService.login('admin', 'wrongpass');
assert.strictEqual(badLogin.success, false, 'Bad password should fail');
console.log('✓ Incorrect password rejection verified');

// 3. Product & Batch Creation (PRD Criterion 1)
console.log('\n--- 2. Testing Product Master & Opening Stock ---');
const prodSku = `TEST-UREA-${Date.now().toString().slice(-4)}`;
const prodRes = inventoryService.createProduct({
  name: 'Test Neem Coated Urea 45kg',
  sku: prodSku,
  barcode: '89099990001',
  category: 'Fertilizers',
  unit: 'Bag',
  hsn_sac: '31021000',
  purchase_rate: 250,
  selling_rate: 280,
  mrp: 280,
  tax_rate: 5,
  opening_stock: 50,
  min_stock: 15,
  batch_number: 'TEST-BAT-01',
  mfg_date: '2026-01-01',
  expiry_date: '2028-01-01',
});
assert.strictEqual(prodRes.success, true, 'Product creation should succeed');
const testProduct = prodRes.product;
assert.strictEqual(testProduct.current_stock, 50, 'Opening stock should be 50');
assert.strictEqual(testProduct.batches.length, 1, 'Initial batch should exist');
console.log(`✓ Product '${testProduct.name}' created with 50 units in batch ${testProduct.batches[0].batch_number}`);

// 4. Customer Creation (PRD Criterion 2)
console.log('\n--- 3. Testing Customer Creation & Credit Limit ---');
const custMobile = `9845${Date.now().toString().slice(-6)}`;
const custRes = customerService.createCustomer({
  name: 'Farmer Basavaraj',
  mobile: custMobile,
  village: 'Keregodu',
  taluk: 'Mandya',
  farm_name: 'Basaveshwara Farm',
  farm_size: '8 Acres',
  crop_info: 'Sugarcane, Paddy',
  credit_limit: 30000,
});
assert.strictEqual(custRes.success, true, 'Customer creation should succeed');
const testCustomer = custRes.customer;
assert.strictEqual(testCustomer.outstanding_balance, 0, 'Initial balance should be 0');
console.log(`✓ Customer '${testCustomer.name}' registered with ₹30,000 credit limit`);

// 5. Transactional Sale Creation (PRD Criteria 3, 4, 5, 6, 7, 11, 12)
console.log('\n--- 4. Testing POS Sale, Inventory Deduction & Udhaar ---');
const saleQty = 5;
const saleRate = 280;
const subtotal = saleQty * saleRate; // 1400
const taxRate = 5;
const taxAmount = Math.round((subtotal * (taxRate / 100)) * 100) / 100; // 70
const grandTotal = Math.round(subtotal + taxAmount); // 1470
const paidAmount = 470; // Partial payment: 470 paid, 1000 credit
const balanceDue = grandTotal - paidAmount; // 1000

const saleRes = billingService.createSale({
  customerId: testCustomer.id,
  customerName: testCustomer.name,
  customerMobile: testCustomer.mobile,
  customerVillage: testCustomer.village,
  subtotal,
  discountType: 'fixed',
  discountValue: 0,
  totalDiscount: 0,
  taxAmount,
  grandTotal,
  roundOff: 0,
  paymentMethod: 'mixed',
  paidAmount,
  balanceDue,
  notes: 'Partial payment on delivery',
  items: [
    {
      product_id: testProduct.id,
      batch_id: testProduct.batches[0].id,
      product_name: testProduct.name,
      batch_number: testProduct.batches[0].batch_number,
      expiry_date: testProduct.batches[0].expiry_date,
      quantity: saleQty,
      unit: testProduct.unit,
      rate: saleRate,
      discount_amount: 0,
      tax_rate: taxRate,
      taxable_amount: subtotal,
      tax_amount: taxAmount,
      total_amount: grandTotal,
    },
  ],
});
assert.strictEqual(saleRes.success, true, 'Sale creation should succeed');
const createdSale = saleRes.sale;
console.log(`✓ Sale '${createdSale.invoice_number}' created for ₹${createdSale.grand_total} (Paid: ₹${paidAmount}, Due: ₹${balanceDue})`);

// Verify Inventory Reduction (PRD Criterion 11)
const updatedProd = inventoryService.getProductById(testProduct.id);
assert.strictEqual(updatedProd.current_stock, 50 - saleQty, 'Product stock must decrease by 5');
assert.strictEqual(updatedProd.batches[0].quantity, 50 - saleQty, 'Batch stock must decrease by 5');
console.log(`✓ Inventory accurately deducted: Stock is now ${updatedProd.current_stock} (was 50)`);

// Verify Customer Outstanding Update (PRD Criterion 12)
const updatedCust = customerService.getCustomerById(testCustomer.id);
assert.strictEqual(updatedCust.outstanding_balance, balanceDue, 'Customer balance should increase by due amount');
console.log(`✓ Customer outstanding updated to ₹${updatedCust.outstanding_balance}`);

// 6. Mandatory Printing Workflow & Error Handling (PRD Criteria 8, 9, 10)
console.log('\n--- 5. Testing Mandatory Printing & Retry Workflow ---');
// Initial print state is pending
assert.strictEqual(createdSale.print_status, 'pending', 'Initial print status must be pending');

// Simulate Printer Error / Unavailable
printingService.updatePrintStatus(createdSale.id, 'failed', 'Printer paper empty or offline', 'thermal_80');
const failedSale = billingService.getSaleById(createdSale.id);
assert.strictEqual(failedSale.print_status, 'failed', 'Print status should be recorded as failed');
assert.strictEqual(failedSale.status, 'completed', 'Finalized invoice must NOT be lost on printer error');
console.log('✓ Printer error handled: Sale preserved in DB with print_status: failed');

// Retry Print Successful
printingService.updatePrintStatus(createdSale.id, 'printed', undefined, 'thermal_80');
const printedSale = billingService.getSaleById(createdSale.id);
assert.strictEqual(printedSale.print_status, 'printed', 'Print status should be printed');
assert.strictEqual(printedSale.print_count, 1, 'Print count should be 1');
console.log('✓ Retry Print succeeded: print_status is now printed, print_count: 1');

// Reprint Test (US-03)
const reprintRes = printingService.reprintSale(createdSale.id, 'thermal_80');
assert.strictEqual(reprintRes.success, true, 'Reprint job creation should succeed');
console.log('✓ Reprint job created from Sales History');

// 7. Customer Ledger Statement (PRD Criterion 13)
console.log('\n--- 6. Testing Customer Ledger & Balance Collection ---');
const ledgerBefore = customerService.getCustomerLedger(testCustomer.id);
assert.strictEqual(ledgerBefore.entries.length, 2, 'Should have 1 invoice and 1 payment entry');
assert.strictEqual(ledgerBefore.currentBalance, 1000, 'Current ledger balance should be 1000');
console.log('✓ Customer ledger verified: Debit ₹1470, Credit ₹470, Balance ₹1000');

// Collect Remaining Udhaar
const collectRes = customerService.collectPayment({
  customerId: testCustomer.id,
  amount: 1000,
  paymentMethod: 'upi',
  referenceNumber: 'UPI-TEST-9988',
  notes: 'Cleared remaining due via UPI',
});
assert.strictEqual(collectRes.success, true, 'Payment collection should succeed');
const settledCust = customerService.getCustomerById(testCustomer.id);
assert.strictEqual(settledCust.outstanding_balance, 0, 'Customer balance should now be 0');
console.log('✓ Collected full ₹1000 balance: Customer outstanding is now ₹0');

// 8. Purchase Inward & Stock Increase (PRD Criteria 14, 15)
console.log('\n--- 7. Testing Inward Purchases & Batch Addition ---');
const sup = supplierService.getSuppliers()[0];
const purRes = purchaseService.createPurchase({
  invoiceNumber: `PUR-INV-${Date.now().toString().slice(-4)}`,
  supplierId: sup.id,
  purchaseDate: '2026-09-28',
  subtotal: 5000,
  taxAmount: 0,
  discountAmount: 0,
  totalAmount: 5000,
  paidAmount: 5000,
  balanceDue: 0,
  paymentStatus: 'paid',
  items: [
    {
      product_id: testProduct.id,
      product_name: testProduct.name,
      batch_number: 'TEST-BAT-02',
      mfg_date: '2026-06-01',
      expiry_date: '2028-06-01',
      quantity: 20,
      unit: testProduct.unit,
      purchase_rate: 250,
      mrp: 280,
      selling_rate: 280,
      tax_rate: 5,
      total_amount: 5000,
    },
  ],
});
assert.strictEqual(purRes.success, true, 'Purchase should succeed');
const prodAfterPurchase = inventoryService.getProductById(testProduct.id);
assert.strictEqual(prodAfterPurchase.current_stock, 45 + 20, 'Stock should increase by 20 to 65');
assert.strictEqual(prodAfterPurchase.batches.length, 2, 'Product should now have 2 batches');
console.log(`✓ Purchase inward verified: Stock increased to ${prodAfterPurchase.current_stock} across 2 batches`);

// 9. Stock Adjustment with Mandatory Reason
console.log('\n--- 8. Testing Stock Adjustment & Audit Movement ---');
const adjRes = inventoryService.adjustStock({
  productId: testProduct.id,
  quantityChange: -2,
  movementType: 'damage',
  reason: 'Bag punctured during unloading',
});
assert.strictEqual(adjRes.success, true, 'Stock adjustment should succeed');
const prodAfterAdj = inventoryService.getProductById(testProduct.id);
assert.strictEqual(prodAfterAdj.current_stock, 63, 'Stock should be 63 after -2 damage');
console.log('✓ Stock adjustment logged: Stock is now 63');

// 10. Reports Verification (PRD Criterion 16)
console.log('\n--- 9. Testing Sales & Tax Reports ---');
const salesRep = reportService.getSalesReport();
assert.ok(salesRep.summary.total_sales > 0, 'Sales report should reflect finalized sales');
console.log(`✓ Sales report verified: Total sales recorded = ₹${salesRep.summary.total_sales}`);

const taxRep = reportService.getTaxReport();
assert.ok(taxRep.taxSlabs.length > 0, 'Tax slabs should be populated');
console.log(`✓ Tax report verified: GST collected across ${taxRep.taxSlabs.length} slabs`);

// 11. Deterministic Insight Engine Verification
console.log('\n--- 10. Testing Deterministic Insight Engine ---');
const dashSummary = insightService.getDashboardSummary();
assert.ok(dashSummary.todaySales >= 0, 'Dashboard summary todaySales must be numeric');
assert.ok(dashSummary.conciseInsightSummary.length > 0, 'Concise insight summary must exist');
console.log(`✓ Dashboard Summary: "${dashSummary.conciseInsightSummary}"`);

const salesInsights = insightService.getSalesInsights('month');
assert.strictEqual(salesInsights.hasEnoughData, true, 'Should detect sales data');
assert.ok(salesInsights.insightsText.length > 0, 'Observations must be generated');
console.log(`✓ Sales Insights Observations: ${salesInsights.insightsText[0]}`);

const invInsights = insightService.getInventoryInsights();
assert.ok(invInsights.totalStockValue > 0, 'Stock value must be positive');
console.log(`✓ Inventory Diagnostics: Total valuation = ₹${Math.round(invInsights.totalStockValue)}`);

// 12. Local SQLite Backup & Recovery (PRD Criterion 17)
console.log('\n--- 11. Testing Local Backup Creation & Verification ---');
const backupRes = backupService.createBackup();
assert.strictEqual(backupRes.success, true, 'Backup creation must succeed');
assert.ok(fs.existsSync(backupRes.filePath), 'Backup file must exist on disk');
assert.ok(backupRes.fileSize > 0, 'Backup file size must be greater than zero');
console.log(`✓ Local SQLite backup created: ${backupRes.filePath} (${(backupRes.fileSize / 1024).toFixed(1)} KB)`);

console.log('\n====================================================');
console.log('ALL INTEGRATION & BUSINESS WORKFLOW TESTS PASSED!');
console.log('====================================================\n');
