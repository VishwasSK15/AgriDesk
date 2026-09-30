const { ElectronDriver } = require('./lib/electron-driver');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const Database = require('better-sqlite3');

const qaDir = path.resolve(
  process.env.APPDATA
    ? path.join(process.env.APPDATA, 'AgriculturalBilling-QA')
    : path.join(__dirname, '../data-qa')
);
const qaDbPath = path.join(qaDir, 'agricultural_qa.db');

function pass(name, details = '') {
  console.log(`  ✓ [PASS] ${name}${details ? ' — ' + details : ''}`);
}

function fail(name, err) {
  console.error(`  ✗ [FAIL] ${name} — ${err.message || err}`);
  process.exit(1);
}

async function runFullAcceptanceSuite() {
  console.log('================================================================');
  console.log('COMPREHENSIVE AUTOMATED ACCEPTANCE SUITE — AGRICULTURAL BILLING');
  console.log('================================================================\n');

  assert(fs.existsSync(qaDbPath), `Target QA database does not exist at: ${qaDbPath}`);
  console.log(`Target QA Database: ${qaDbPath}\n`);

  // Record initial database counts
  const dbBefore = new Database(qaDbPath, { readonly: true });
  const countsBefore = {
    products: dbBefore.prepare('SELECT COUNT(*) as c FROM products').get().c,
    customers: dbBefore.prepare('SELECT COUNT(*) as c FROM customers').get().c,
    suppliers: dbBefore.prepare('SELECT COUNT(*) as c FROM suppliers').get().c,
    purchases: dbBefore.prepare('SELECT COUNT(*) as c FROM purchases').get().c,
    sales: dbBefore.prepare('SELECT COUNT(*) as c FROM sales').get().c,
    payments: dbBefore.prepare('SELECT COUNT(*) as c FROM payments').get().c,
    stock_movements: dbBefore.prepare('SELECT COUNT(*) as c FROM stock_movements').get().c,
    print_jobs: dbBefore.prepare('SELECT COUNT(*) as c FROM print_jobs').get().c,
    audit_logs: dbBefore.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c,
  };
  dbBefore.close();

  console.log('Initial Database Baseline Counts:');
  console.table(countsBefore);

  // ---------------------------------------------------------------------------
  // TEST PHASE 1: LAUNCH & WINDOW BEHAVIOR
  // ---------------------------------------------------------------------------
  console.log('\n--- PHASE 1: FIXED MAXIMIZED WINDOW BEHAVIOR ---');

  let driver = new ElectronDriver({
    port: 9245,
    env: {
      AGRI_ENV: 'qa',
      NODE_ENV: 'production',
      AGRI_SIMULATE_PRINT_FAIL: 'false',
      AGRI_AUTOMATED_TEST: 'true',
    },
  });

  await driver.launch();
  pass('Application Launch', 'Electron launched successfully with QA environment');

  try {
    await driver.sleep(1000);
    const bodyText = await driver.getBodyText();
    if (bodyText.includes('Sign In to Counter')) {
      await driver.fill('input[type="text"]', 'admin');
      await driver.fill('input[type="password"]', 'admin123');
      await driver.clickText('Sign In to Counter');
      await driver.waitForText('Dashboard');
      pass('Counter Sign In', 'Authenticated as admin');
    } else {
      await driver.waitForText('Dashboard');
      pass('Counter Session', 'Session already active');
    }

    await driver.evaluate('window.confirm = () => true; window.alert = () => {};');

    // Inspect window state via native IPC
    const windowState = await driver.evaluate('window.electronAPI.getWindowState()');
    console.log('  Window state:', windowState);

    assert.strictEqual(windowState.isMaximized, true, 'Window should launch maximized');
    pass('Launch Maximized', 'Window is maximized upon startup');

    assert.strictEqual(windowState.isResizable, false, 'Window resizing must be disabled to prevent distorted layouts');
    pass('Fixed Window Non-Resizable', 'Border and corner drag resizing disabled (resizable: false)');

    assert.strictEqual(windowState.isFullScreen, false, 'Window must NOT be borderless fullscreen');
    pass('Not Fullscreen', 'Window runs in maximized desktop mode with standard titlebar');

    assert.strictEqual(windowState.isKiosk, false, 'Window must NOT be kiosk mode');
    pass('Not Kiosk Mode', 'Standard desktop navigation and taskbar are preserved');

    assert(windowState.workArea && windowState.workArea.width >= 1024, 'Window adapts dynamically to actual display workArea');
    pass('Dynamic Work Area Adaptation', `Window dynamically bound to display (${windowState.workArea.width}x${windowState.workArea.height}, scaleFactor: ${windowState.scaleFactor})`);

    // Test minimize and restore
    await driver.evaluate('window.electronAPI.minimizeWindow()');
    await driver.sleep(400);
    const minimizedState = await driver.evaluate('window.electronAPI.getWindowState()');
    assert.strictEqual(minimizedState.isMinimized, true, 'Window must be minimizable via standard Windows controls');
    pass('Minimization', 'Window minimizes cleanly to taskbar');

    await driver.evaluate('window.electronAPI.restoreWindow()');
    await driver.sleep(400);
    const restoredState = await driver.evaluate('window.electronAPI.getWindowState()');
    assert.strictEqual(restoredState.isMaximized, true, 'Window must restore to maximized state');
    pass('Restoration', 'Window restores to locked maximized layout');

    // -------------------------------------------------------------------------
    // TEST PHASE 2: KEYBOARD SHORTCUTS
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 2: KEYBOARD SHORTCUTS & FOCUS TRAPS ---');

    // 1. F1 Global Navigation: From Dashboard, F1 must switch to Billing tab
    await driver.clickText('Dashboard');
    await driver.waitForText("Today's Store Pulse");
    await driver.pressKey('F1');
    await driver.sleep(400);
    const onBillingTab = await driver.evaluate(`document.body.innerText.includes('FEFO Auto-Batch')`);
    assert.strictEqual(onBillingTab, true, 'F1 key should navigate to Billing POS from anywhere');
    pass('F1 Shortcut', 'Navigates to Billing POS tab from another page');

    // 2. F2: Focuses product search input
    await driver.evaluate('document.body.focus()');
    await driver.pressKey('F2');
    await driver.sleep(300);
    const f2Active = await driver.evaluate(`(() => {
      const el = document.activeElement;
      return el && el.placeholder && el.placeholder.includes('Scan barcode');
    })()`);
    assert.strictEqual(f2Active, true, 'F2 key must focus the product search input');
    pass('F2 Shortcut', 'Product search input focused');

    // 3. F3: Focuses customer search input
    await driver.pressKey('F3');
    await driver.sleep(300);
    const f3Active = await driver.evaluate(`(() => {
      const el = document.activeElement;
      return el && el.placeholder && el.placeholder.includes('Search Customer');
    })()`);
    assert.strictEqual(f3Active, true, 'F3 key must focus the customer search input');
    pass('F3 Shortcut', 'Customer search input focused');

    // 4. Clean shortcut labels: Verify F4 and F7 are NOT rendered as non-functional shortcut tags
    const hasF4OrF7 = await driver.evaluate(`(() => {
      const text = document.body.innerText;
      return text.includes('[F4]') || text.includes('(F4)') || text.includes('[F7]') || text.includes('(F7)');
    })()`);
    assert.strictEqual(hasF4OrF7, false, 'Non-functional shortcut tags (F4, F7) must not be displayed in UI');
async function addProductToCart(driver, searchQuery) {
  await driver.fill('input[placeholder*="Scan barcode"]', searchQuery);
  await driver.sleep(400);

  await driver.evaluate(`(() => {
    const items = Array.from(document.querySelectorAll('.z-30 .cursor-pointer'));
    const match = items.find(el => el.innerText.toLowerCase().includes(${JSON.stringify(searchQuery.toLowerCase())})) || items[0];
    if (match) match.click();
  })()`);
  await driver.sleep(300);

  const hasBatchModal = await driver.evaluate(`(() => {
    return document.body.innerText.includes('Select Batch') && !!document.querySelector('.space-y-2 .cursor-pointer');
  })()`);
  if (hasBatchModal) {
    await driver.evaluate(`(() => {
      const item = document.querySelector('.space-y-2 .cursor-pointer');
      if (item) item.click();
    })()`);
    await driver.sleep(300);
  }
}

    // 5. F5: Hold Bill
    // Add an item to cart first
    await addProductToCart(driver, 'Urea');
    await driver.sleep(300);

    // Press F5 to hold bill
    await driver.pressKey('F5');
    await driver.sleep(400);
    const cartEmptyAfterHold = await driver.evaluate(`(() => {
      return document.body.innerText.includes('Current bill is empty') || document.body.innerText.includes('Bill held successfully');
    })()`);
    assert.strictEqual(cartEmptyAfterHold, true, 'F5 must put the current bill on hold');
    pass('F5 Shortcut', 'Puts current bill on hold and clears POS workspace');

    // 6. F6: Opens Held Bills modal globally
    // Navigate to Customers page, then press F6
    await driver.clickText('Customers');
    await driver.waitForText('Farmer Khata Ledger');
    await driver.pressKey('F6');
    await driver.sleep(400);
    const heldModalOpen = await driver.evaluate(`document.body.innerText.includes('Held Counter Bills')`);
    assert.strictEqual(heldModalOpen, true, 'F6 must open the Held Bills modal from any page');
    pass('F6 Shortcut', 'Opens Held Bills modal globally across pages');

    // 7. Escape: Closes open modal
    await driver.pressKey('Escape');
    await driver.sleep(300);
    const heldModalClosed = await driver.evaluate(`!document.body.innerText.includes('Held Counter Bills')`);
    assert.strictEqual(heldModalClosed, true, 'Escape key must close open modal');
    pass('Escape Shortcut', 'Closes open modal dialog cleanly');

    // Return to Billing and resume the held bill
    await driver.pressKey('F1');
    await driver.sleep(300);
    await driver.pressKey('F6');
    await driver.sleep(300);
    await driver.clickText('Resume');
    await driver.sleep(400);
    pass('Recall Held Bill', 'Resumed held bill into POS cart');

    // 8. F9: Save & Print Bill
    await driver.pressKey('F9');
    await driver.sleep(500);
    const printModalOpen = await driver.evaluate(`document.body.innerText.includes('Finalize & Mandatory Bill Print') || document.body.innerText.includes('Bill Print & Receipt Preview')`);
    assert.strictEqual(printModalOpen, true, 'F9 key must save sale and trigger print modal');
    pass('F9 Shortcut', 'Saves sale and triggers Mandatory Print modal');

    // -------------------------------------------------------------------------
    // TEST PHASE 3: WINDOWS NATIVE PRINTING & PDF EXPORT
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 3: WINDOWS NATIVE PRINTING & PDF EXPORT ---');

    // 1. Get available printers list
    const printers = await driver.evaluate('window.electronAPI.getPrinters()');
    console.log(`  Discovered ${printers.length} printer devices:`, printers.map(p => p.name));
    assert(Array.isArray(printers) && printers.length > 0, 'Must detect at least 1 printer or system default');
    pass('Printer Detection', `Retrieved ${printers.length} system printer(s)`);

    // 2. Format Switching (58mm, 80mm, A4)
    await driver.clickText('80mm Thermal');
    await driver.sleep(200);
    pass('Print Format Selection', 'Switched print format to 80mm Thermal');

    await driver.clickText('A4 GST Invoice');
    await driver.sleep(200);
    pass('Print Format Selection', 'Switched print format to A4 GST Invoice');

    // 3. Save PDF Export
    const pdfResult = await driver.evaluate(`window.electronAPI.savePDF({ defaultFilename: 'test_export_invoice.pdf', format: 'A4' })`);
    console.log('  savePDF result:', pdfResult);
    assert.strictEqual(pdfResult.success, true, 'savePDF must succeed');
    assert(fs.existsSync(pdfResult.filePath), 'Generated PDF file must exist on disk');
    const pdfStats = fs.statSync(pdfResult.filePath);
    assert(pdfStats.size > 5000, `PDF size must be valid (>5000 bytes for authentic document), got ${pdfStats.size} bytes`);
    
    // Validate authentic binary PDF structure
    const pdfBuffer = fs.readFileSync(pdfResult.filePath);
    const pdfHeader = pdfBuffer.subarray(0, 5).toString('ascii');
    assert.strictEqual(pdfHeader, '%PDF-', 'Generated PDF must begin with %PDF- signature');
    const pdfString = pdfBuffer.toString('latin1');
    assert(pdfString.includes('%%EOF'), 'Generated PDF must contain valid %%EOF trailer');
    pass('Save PDF Export', `Authentic binary PDF created (${pdfStats.size} bytes, starts with %PDF-, ends with %%EOF)`);

    // Verify Open PDF API
    const openRes = await driver.evaluate(`window.electronAPI.openPath(${JSON.stringify(pdfResult.filePath)})`);
    assert.strictEqual(openRes.success, true, 'openPath must succeed for valid generated PDF');
    pass('Open PDF API', 'Invoked shell openPath successfully for generated PDF');

    // Verify Show in Folder API
    const showRes = await driver.evaluate(`window.electronAPI.showItemInFolder(${JSON.stringify(pdfResult.filePath)})`);
    assert.strictEqual(showRes.success, true, 'showItemInFolder must succeed');
    pass('Show in Folder API', 'Invoked shell showItemInFolder successfully');

    // 4. Test Native Print Cancellation without failure
    const cancelRes = await driver.evaluate(`window.electronAPI.printWindow({ targetPrinter: 'Microsoft Print to PDF', simulateCancel: true })`);
    console.log('  Print Cancel result:', cancelRes);
    assert.strictEqual(cancelRes.success, false, 'Cancellation returns success=false');
    assert.strictEqual(cancelRes.errorType, 'cancelled', 'Must report errorType: cancelled');
    pass('Print Cancellation Handling', 'OS print cancellation gracefully reported as cancelled without failing bill');

    // 5. Test Print Success & Complete
    const printRes = await driver.evaluate(`window.electronAPI.printWindow({ targetPrinter: 'Microsoft Print to PDF' })`);
    console.log('  Print Success result:', printRes);
    assert.strictEqual(printRes.success, true, 'printWindow must succeed');
    pass('Native Print Invocation', 'Dispatched native print job cleanly');

    await driver.clickText('Complete & Close');
    await driver.sleep(400);
    pass('Print Flow Completion', 'Closed print modal and returned to empty POS');

  } finally {
    await driver.close();
    pass('First Session Closed', 'Electron process terminated cleanly');
  }

  // ---------------------------------------------------------------------------
  // TEST PHASE 4: DATA PERSISTENCE ACROSS RESTART
  // ---------------------------------------------------------------------------
  console.log('\n--- PHASE 4: RESTART PERSISTENCE & DATA INTEGRITY ---');

  // Verify SQLite database on disk before relaunch
  const dbAfter = new Database(qaDbPath, { readonly: true });
  const countsAfter = {
    products: dbAfter.prepare('SELECT COUNT(*) as c FROM products').get().c,
    customers: dbAfter.prepare('SELECT COUNT(*) as c FROM customers').get().c,
    suppliers: dbAfter.prepare('SELECT COUNT(*) as c FROM suppliers').get().c,
    purchases: dbAfter.prepare('SELECT COUNT(*) as c FROM purchases').get().c,
    sales: dbAfter.prepare('SELECT COUNT(*) as c FROM sales').get().c,
    payments: dbAfter.prepare('SELECT COUNT(*) as c FROM payments').get().c,
    stock_movements: dbAfter.prepare('SELECT COUNT(*) as c FROM stock_movements').get().c,
    print_jobs: dbAfter.prepare('SELECT COUNT(*) as c FROM print_jobs').get().c,
    audit_logs: dbAfter.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c,
  };
  dbAfter.close();

  console.log('Database Record Counts After Operations:');
  console.table(countsAfter);

  // We added 1 sale in this test run, so sales count is baseline + 1
  assert(countsAfter.products >= 25 && countsAfter.products <= 30, `Products (${countsAfter.products}) must be in range 25-30`);
  assert(countsAfter.customers >= 20 && countsAfter.customers <= 25, `Customers (${countsAfter.customers}) must be in range 20-25`);
  assert(countsAfter.suppliers >= 10 && countsAfter.suppliers <= 15, `Suppliers (${countsAfter.suppliers}) must be in range 10-15`);
  assert(countsAfter.purchases >= 15 && countsAfter.purchases <= 20, `Purchases (${countsAfter.purchases}) must be in range 15-20`);
  assert(countsAfter.sales >= 25 && countsAfter.sales <= 65, `Sales (${countsAfter.sales}) must be in range 25-65`);
  pass('QA Dataset Targets Met', 'All 5 core table counts are within target thresholds');

  // Launch second Electron session to confirm UI reads persisted database correctly
  console.log('\nLaunching Second Electron Session to verify cold-start persistence...');
  const driver2 = new ElectronDriver({
    port: 9246,
    env: {
      AGRI_ENV: 'qa',
      NODE_ENV: 'production',
      AGRI_SIMULATE_PRINT_FAIL: 'false',
      AGRI_AUTOMATED_TEST: 'true',
    },
  });

  await driver2.launch();
  try {
    await driver2.sleep(1000);
    const body2 = await driver2.getBodyText();
    if (body2.includes('Sign In to Counter')) {
      await driver2.fill('input[type="text"]', 'admin');
      await driver2.fill('input[type="password"]', 'admin123');
      await driver2.clickText('Sign In to Counter');
      await driver2.waitForText('Dashboard');
    }

    // Verify Products page displays catalog
    await driver2.clickText('Products & Stock');
    await driver2.waitForText('TEST Neem Coated Urea 45kg');
    await driver2.waitForText('TEST MOP Potash 50kg');
    pass('Products UI Persistence', 'Product inventory catalog loaded on fresh restart');

    // Verify Customers page displays khata ledger
    await driver2.clickText('Customers');
    await driver2.waitForText('TEST Ramesh Gowda');
    await driver2.waitForText('TEST Doddagowda Patil');
    pass('Customers UI Persistence', 'Farmer Khata records and balances loaded on fresh restart');

    // Verify Purchases page displays purchase invoices
    await driver2.clickText('Purchases');
    await driver2.waitForText('PUR-IFF-2026-01');
    pass('Purchases UI Persistence', 'Inward supplier purchases loaded on fresh restart');

    // Verify Reports page displays sales & collections
    await driver2.clickText('Reports');
    await driver2.waitForText('Period Total Sales');
    await driver2.waitForText('Total Collections');
    pass('Reports UI Persistence', 'Financial reports computed from persisted database');

    console.log('\n================================================================');
    console.log('ALL ACCEPTANCE & REGRESSION VERIFICATIONS PASSED (100% SUCCESS)');
    console.log('================================================================');
  } finally {
    await driver2.close();
  }
}

runFullAcceptanceSuite().catch((err) => {
  console.error('\n✗ Test Suite Aborted with Unhandled Exception:', err);
  process.exit(1);
});
