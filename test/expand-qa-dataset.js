const { ElectronDriver } = require('./lib/electron-driver');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Target retained QA Database
const qaDir = path.resolve(
  process.env.APPDATA
    ? path.join(process.env.APPDATA, 'AgriculturalBilling-QA')
    : path.join(__dirname, '../data-qa')
);
const qaDbPath = path.join(qaDir, 'agricultural_qa.db');

function logStep(name, detail = '') {
  console.log(`  [UI Step] ${name}${detail ? ' -> ' + detail : ''}`);
}

async function addProductToCart(driver, searchQuery, qty = 1) {
  await driver.fill('input[placeholder*="Scan barcode"]', searchQuery);
  await driver.sleep(400);

  // Click matching autocomplete result
  await driver.evaluate(`(() => {
    const items = Array.from(document.querySelectorAll('.z-30 .cursor-pointer'));
    const match = items.find(el => el.innerText.toLowerCase().includes(${JSON.stringify(searchQuery.toLowerCase())})) || items[0];
    if (match) match.click();
  })()`);
  await driver.sleep(300);

  // If multi-batch modal opens, select first available batch
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

  // Set quantity if > 1 using React prototype setter
  if (qty > 1) {
    await driver.evaluate(`(() => {
      const inputs = Array.from(document.querySelectorAll('tbody input[type="number"][min="1"]'));
      const lastInput = inputs[inputs.length - 1];
      if (lastInput) {
        lastInput.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) {
          setter.call(lastInput, ${JSON.stringify(qty.toString())});
        } else {
          lastInput.value = ${JSON.stringify(qty.toString())};
        }
        lastInput.dispatchEvent(new Event('input', { bubbles: true }));
        lastInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await driver.sleep(200);
  }
}

async function selectCustomerInPOS(driver, searchQuery) {
  await driver.fill('input[placeholder*="Search Customer"]', searchQuery);
  await driver.sleep(400);
  await driver.evaluate(`(() => {
    const items = Array.from(document.querySelectorAll('.z-30 .cursor-pointer'));
    const match = items.find(el => el.innerText.toLowerCase().includes(${JSON.stringify(searchQuery.toLowerCase())})) || items[0];
    if (match) match.click();
  })()`);
  await driver.sleep(300);
}

async function runQADataExpansion() {
  console.log('======================================================');
  console.log('RETAINED QA DATASET EXPANSION VIA ACTUAL UI WORKFLOWS');
  console.log('======================================================\n');
  console.log('Target Database Path:', qaDbPath);

  // Safety Backup of existing QA database
  if (fs.existsSync(qaDbPath)) {
    const backupPath = path.join(qaDir, 'agricultural_qa_pre_expansion.db');
    fs.copyFileSync(qaDbPath, backupPath);
    console.log('✓ Pre-expansion QA backup preserved at:', backupPath);
  }

  // Launch Electron with QA Profile
  const driver = new ElectronDriver({
    port: 9235,
    env: {
      AGRI_ENV: 'qa',
      NODE_ENV: 'production',
      AGRI_SIMULATE_PRINT_FAIL: 'false',
    },
  });

  await driver.launch();
  console.log('✓ Electron connected for automated UI execution\n');

  try {
    // Authenticate if needed
    await driver.sleep(1000);
    const bodyText = await driver.getBodyText();
    if (bodyText.includes('Sign In to Counter')) {
      await driver.fill('input[type="text"]', 'admin');
      await driver.fill('input[type="password"]', 'admin123');
      await driver.clickText('Sign In to Counter');
      await driver.waitForText('Dashboard');
      console.log('✓ Signed in to counter as admin');
    } else {
      await driver.waitForText('Dashboard');
      console.log('✓ Counter session active');
    }

    // Ensure dialog prompts (like credit limit over-allocation confirmation) do not block automation
    await driver.evaluate('window.confirm = () => true; window.alert = () => {};');

    // =========================================================================
    // PART 5: EXPAND PRODUCTS / INVENTORY (Target: 25-30 total)
    // =========================================================================
    console.log('\n--- EXPANDING PRODUCTS / INVENTORY CATALOG VIA UI ---');
    await driver.clickText('Products & Stock');
    await driver.waitForText('Add Product');

    const productsToCreate = [
      // Fertilizers
      {
        name: 'TEST MOP Potash 50kg',
        sku: 'TEST-FERT-MOP',
        category: 'Fertilizers',
        brand: 'IPL Potash',
        pack: '50kg',
        unit: 'Bag',
        spec: 'Muriate of Potash K2O 60%',
        hsn: '31042000',
        pRate: '1600',
        sRate: '1750',
        mrp: '1750',
        gst: '5',
        stock: '30',
        min: '8',
        batch: 'BAT-MOP-01',
        exp: '2029-03-31',
      },
      {
        name: 'TEST Single Super Phosphate 50kg',
        sku: 'TEST-FERT-SSP',
        category: 'Fertilizers',
        brand: 'Coromandel Gromor',
        pack: '50kg',
        unit: 'Bag',
        spec: 'Phosphorus 16%, Sulphur 11%',
        hsn: '31031000',
        pRate: '420',
        sRate: '480',
        mrp: '500',
        gst: '5',
        stock: '35',
        min: '10',
        batch: 'BAT-SSP-01',
        exp: '2028-11-30',
      },
      {
        name: 'TEST Water Soluble NPK 19-19-19 1kg',
        sku: 'TEST-FERT-NPK19',
        category: 'Fertilizers',
        brand: 'Mahadhan',
        pack: '1kg',
        unit: 'Packet',
        spec: '100% Water Soluble NPK 19:19:19',
        hsn: '31052000',
        pRate: '140',
        sRate: '185',
        mrp: '210',
        gst: '5',
        stock: '50',
        min: '15',
        batch: 'BAT-NPK19-01',
        exp: '2028-09-30',
      },
      {
        name: 'TEST Bio NPK Consortia 1L',
        sku: 'TEST-BIO-NPK',
        category: 'Fertilizers',
        brand: 'IFFCO Kisan',
        pack: '1 Litre',
        unit: 'Bottle',
        spec: 'Azotobacter, PSB, KMB Liquid Consortia',
        hsn: '31010099',
        pRate: '210',
        sRate: '280',
        mrp: '320',
        gst: '5',
        stock: '25',
        min: '5',
        batch: 'BAT-BIONPK-01',
        exp: '2027-06-30',
      },
      // Insecticides
      {
        name: 'TEST Imidacloprid 17.8% SL 250ml',
        sku: 'TEST-PEST-IMIDA',
        category: 'Pesticides',
        brand: 'Bayer Confidor',
        pack: '250ml',
        unit: 'Bottle',
        spec: 'Imidacloprid 17.8% SL Systemic Insecticide',
        hsn: '38089199',
        pRate: '340',
        sRate: '420',
        mrp: '450',
        gst: '18',
        stock: '20',
        min: '6',
        batch: 'BAT-IMIDA-01',
        exp: '2027-10-31',
      },
      {
        name: 'TEST Emamectin Benzoate 5% SG 100g',
        sku: 'TEST-PEST-EMAM',
        category: 'Pesticides',
        brand: 'Syngenta Proclaim',
        pack: '100g',
        unit: 'Packet',
        spec: 'Emamectin Benzoate 5% SG Caterpillars',
        hsn: '38089199',
        pRate: '320',
        sRate: '390',
        mrp: '420',
        gst: '18',
        stock: '22',
        min: '5',
        batch: 'BAT-EMAM-01',
        exp: '2027-05-31',
      },
      {
        name: 'TEST Cartap Hydrochloride 4G 5kg',
        sku: 'TEST-PEST-CARTAP',
        category: 'Pesticides',
        brand: 'Dhanuka Padan',
        pack: '5kg',
        unit: 'Packet',
        spec: 'Cartap Hydrochloride 4G Stem Borer',
        hsn: '38089191',
        pRate: '450',
        sRate: '540',
        mrp: '580',
        gst: '18',
        stock: '18',
        min: '5',
        batch: 'BAT-CART-01',
        exp: '2027-12-31',
      },
      {
        name: 'TEST Cypermethrin 10% EC 1L',
        sku: 'TEST-PEST-CYPER',
        category: 'Pesticides',
        brand: 'UPL Ustaad',
        pack: '1 Litre',
        unit: 'Bottle',
        spec: 'Cypermethrin 10% EC Contact Insecticide',
        hsn: '38089199',
        pRate: '280',
        sRate: '350',
        mrp: '380',
        gst: '18',
        stock: '16',
        min: '4',
        batch: 'BAT-CYPER-01',
        exp: '2027-03-31',
      },
      // Fungicides
      {
        name: 'TEST Carbendazim 50% WP 500g',
        sku: 'TEST-FUNG-CARB',
        category: 'Pesticides',
        brand: 'Crystal Bavistin',
        pack: '500g',
        unit: 'Packet',
        spec: 'Carbendazim 50% WP Broad Spectrum',
        hsn: '38089290',
        pRate: '290',
        sRate: '360',
        mrp: '390',
        gst: '18',
        stock: '24',
        min: '6',
        batch: 'BAT-CARB-01',
        exp: '2027-08-31',
      },
      {
        name: 'TEST Hexaconazole 5% SC 1L',
        sku: 'TEST-FUNG-HEXA',
        category: 'Pesticides',
        brand: 'Rallis Contaf Plus',
        pack: '1 Litre',
        unit: 'Bottle',
        spec: 'Hexaconazole 5% SC Sheath Blight',
        hsn: '38089290',
        pRate: '410',
        sRate: '490',
        mrp: '530',
        gst: '18',
        stock: '14',
        min: '4',
        batch: 'BAT-HEXA-01',
        exp: '2027-09-30',
      },
      {
        name: 'TEST Copper Oxychloride 50% WP 500g',
        sku: 'TEST-FUNG-COC',
        category: 'Pesticides',
        brand: 'Tata Blitox',
        pack: '500g',
        unit: 'Packet',
        spec: 'Copper Oxychloride 50% WP Contact',
        hsn: '38089210',
        pRate: '260',
        sRate: '320',
        mrp: '350',
        gst: '18',
        stock: '15',
        min: '5',
        batch: 'BAT-COC-01',
        exp: '2026-11-30', // Near expiry scenario
      },
      // Herbicides
      {
        name: 'TEST Glyphosate 41% SL 1L',
        sku: 'TEST-HERB-GLYPH',
        category: 'Pesticides',
        brand: 'Bayer Roundup',
        pack: '1 Litre',
        unit: 'Bottle',
        spec: 'Glyphosate 41% SL Non-selective Weedicide',
        hsn: '38089390',
        pRate: '390',
        sRate: '470',
        mrp: '500',
        gst: '18',
        stock: '25',
        min: '8',
        batch: 'BAT-GLYPH-01',
        exp: '2027-11-30',
      },
      {
        name: 'TEST Atrazine 50% WP 500g',
        sku: 'TEST-HERB-ATRA',
        category: 'Pesticides',
        brand: 'Tata Atrataf',
        pack: '500g',
        unit: 'Packet',
        spec: 'Atrazine 50% WP Maize Pre-emergence',
        hsn: '38089340',
        pRate: '190',
        sRate: '245',
        mrp: '270',
        gst: '18',
        stock: '18',
        min: '5',
        batch: 'BAT-ATRA-01',
        exp: '2027-04-30',
      },
      {
        name: 'TEST Pendimethalin 30% EC 1L',
        sku: 'TEST-HERB-PENDI',
        category: 'Pesticides',
        brand: 'BASF Stomp Extra',
        pack: '1 Litre',
        unit: 'Bottle',
        spec: 'Pendimethalin 30% EC Pre-emergence',
        hsn: '38089390',
        pRate: '420',
        sRate: '510',
        mrp: '550',
        gst: '18',
        stock: '12',
        min: '4',
        batch: 'BAT-PENDI-01',
        exp: '2027-07-31',
      },
      // Seeds
      {
        name: 'TEST Paddy RNR 15048 Telangana Sona 25kg',
        sku: 'TEST-SEED-PADDY',
        category: 'Seeds',
        brand: 'Kaveri Seeds',
        pack: '25kg',
        unit: 'Bag',
        spec: 'Low GI Fine Grain Paddy Seed',
        hsn: '12099910',
        pRate: '950',
        sRate: '1150',
        mrp: '1200',
        gst: '0',
        stock: '40',
        min: '10',
        batch: 'BAT-PAD-01',
        exp: '2027-02-28',
      },
      {
        name: 'TEST Hybrid Cotton BG-II 475g',
        sku: 'TEST-SEED-COTTON',
        category: 'Seeds',
        brand: 'Rasi RCH-659',
        pack: '475g',
        unit: 'Packet',
        spec: 'Bollgard II Hybrid Cotton Seed',
        hsn: '12099910',
        pRate: '780',
        sRate: '864',
        mrp: '864',
        gst: '0',
        stock: '50',
        min: '12',
        batch: 'BAT-COT-01',
        exp: '2026-12-31',
      },
      {
        name: 'TEST Hybrid Sunflower Seed 2kg',
        sku: 'TEST-SEED-SUN',
        category: 'Seeds',
        brand: 'Syngenta NK Kondi',
        pack: '2kg',
        unit: 'Packet',
        spec: 'High Oil Content Hybrid Sunflower',
        hsn: '12099910',
        pRate: '720',
        sRate: '840',
        mrp: '900',
        gst: '0',
        stock: '20',
        min: '5',
        batch: 'BAT-SUN-01',
        exp: '2027-01-31',
      },
      // Crop Nutrition / Micronutrients & PGR
      {
        name: 'TEST Chelated Zinc 12% EDTA 500g',
        sku: 'TEST-MIC-ZINC',
        category: 'Crop Nutrition',
        brand: 'Aries Agro Chelamin',
        pack: '500g',
        unit: 'Packet',
        spec: 'Zinc EDTA 12% Foliar Spray',
        hsn: '29224900',
        pRate: '210',
        sRate: '275',
        mrp: '300',
        gst: '12',
        stock: '28',
        min: '6',
        batch: 'BAT-ZN-01',
        exp: '2028-06-30',
      },
      {
        name: 'TEST Soluble Boron 20% 250g',
        sku: 'TEST-MIC-BORON',
        category: 'Crop Nutrition',
        brand: 'Multiplex Multi-Boron',
        pack: '250g',
        unit: 'Packet',
        spec: 'Di-Sodium Octaborate Tetrahydrate 20%',
        hsn: '28402090',
        pRate: '130',
        sRate: '175',
        mrp: '195',
        gst: '12',
        stock: '30',
        min: '8',
        batch: 'BAT-BOR-01',
        exp: '2028-08-31',
      },
      {
        name: 'TEST Gibberellic Acid 0.001% L 1L',
        sku: 'TEST-PGR-GA',
        category: 'Crop Nutrition',
        brand: 'Sumitomo Hoshi',
        pack: '1 Litre',
        unit: 'Bottle',
        spec: 'Plant Growth Regulator Gibberellic Acid',
        hsn: '38089340',
        pRate: '350',
        sRate: '440',
        mrp: '480',
        gst: '12',
        stock: '15',
        min: '4',
        batch: 'BAT-GA-01',
        exp: '2027-09-30',
      },
      // Soil Conditioners & Other
      {
        name: 'TEST Agricultural Gypsum 50kg',
        sku: 'TEST-SOIL-GYPSUM',
        category: 'Other',
        brand: 'Agri Minerals Co',
        pack: '50kg',
        unit: 'Bag',
        spec: 'Calcium Sulphate Dihydrate (Ca 18%, S 14%)',
        hsn: '25201010',
        pRate: '180',
        sRate: '230',
        mrp: '250',
        gst: '5',
        stock: '45',
        min: '10',
        batch: 'BAT-GYP-01',
        exp: '2030-12-31',
      },
      {
        name: 'TEST Humic Acid 98% Flakes 1kg',
        sku: 'TEST-SOIL-HUMIC',
        category: 'Crop Nutrition',
        brand: 'BioAgra Pure',
        pack: '1kg',
        unit: 'Packet',
        spec: 'Potassium Humate 98% Soil Conditioner',
        hsn: '38089990',
        pRate: '240',
        sRate: '320',
        mrp: '360',
        gst: '12',
        stock: '30',
        min: '6',
        batch: 'BAT-HUM-01',
        exp: '2029-05-31',
      },
      {
        name: 'TEST Low Stock Formulation 500ml',
        sku: 'TEST-LOW-STOCK',
        category: 'Pesticides',
        brand: 'Speciality Agro',
        pack: '500ml',
        unit: 'Bottle',
        spec: 'Special Formulation (Low Stock Trigger)',
        hsn: '38089199',
        pRate: '200',
        sRate: '260',
        mrp: '280',
        gst: '18',
        stock: '3', // Triggers Low Stock (< min 5)
        min: '10',
        batch: 'BAT-LOW-01',
        exp: '2027-12-31',
      },
      {
        name: 'TEST Zero Stock Formulation 1kg',
        sku: 'TEST-ZERO-STOCK',
        category: 'Fertilizers',
        brand: 'Speciality Agro',
        pack: '1kg',
        unit: 'Packet',
        spec: 'Out of Stock Test Product',
        hsn: '31052000',
        pRate: '150',
        sRate: '210',
        mrp: '230',
        gst: '5',
        stock: '0', // Zero Stock Scenario
        min: '5',
        batch: 'BAT-ZERO-01',
        exp: '2027-08-31',
      }
    ];

    for (const p of productsToCreate) {
      // Check if product already exists in UI
      const existing = await driver.evaluate(`document.body.innerText.includes(${JSON.stringify(p.name)})`);
      if (existing) {
        logStep('Product Exists', p.name);
        continue;
      }

      await driver.clickText('Add Product');
      await driver.waitForText('Add Agricultural Product');

      await driver.fill('input[placeholder="e.g. Neem Coated Urea (45kg)"]', p.name);
      await driver.fill('input[placeholder="e.g. FERT-UREA-45"]', p.sku);
      await driver.select('select:has(option[value="Fertilizers"])', p.category);
      await driver.fill('input[placeholder="e.g. IFFCO, Bayer"]', p.brand);
      await driver.fill('input[placeholder="e.g. 50kg, 1L, 500g"]', p.pack);
      await driver.select('select:has(option[value="Bag"])', p.unit);
      await driver.fill('input[placeholder="e.g. Chlorpyrifos 20% EC, Nitrogen 46%"]', p.spec);
      await driver.fill('input[placeholder="e.g. 31021000, 38089199"]', p.hsn);

      await driver.fillByLabel('Purchase Rate (₹)', p.pRate);
      await driver.fillByLabel('Selling Rate (₹) *', p.sRate);
      await driver.fillByLabel('MRP (₹)', p.mrp);
      await driver.select('select:has(option[value="5"])', p.gst);

      await driver.fillByLabel('Opening Stock', p.stock);
      await driver.fillByLabel('Min Stock (Reorder Level)', p.min);
      await driver.fillByLabel('Batch Number', p.batch);
      await driver.fillByLabel('Expiry Date', p.exp);

      await driver.clickText('Create Product');
      await driver.sleep(400);
      logStep('Created Product via UI', `${p.name} [Stock: ${p.stock}]`);
    }

    // =========================================================================
    // PART 6: EXPAND CUSTOMERS / FARMER KHATA (Target: ~20-25 total)
    // =========================================================================
    console.log('\n--- EXPANDING FARMERS / CUSTOMERS DIRECTORY VIA UI ---');
    await driver.clickText('Customers');
    await driver.waitForText('Register Customer');

    const customersToCreate = [
      { name: 'TEST Shivaraj Patil', mobile: '9845100001', village: 'Shivapura', taluk: 'Maddur', crops: 'Paddy, Ragi', creditLimit: '30000' },
      { name: 'TEST Manjunath Swamy', mobile: '9845100002', village: 'Kallahalli', taluk: 'Mandya', crops: 'Sugarcane, Banana', creditLimit: '45000' },
      { name: 'TEST Anjanappa Reddy', mobile: '9845100003', village: 'Chintamani', taluk: 'Chintamani', crops: 'Tomato, Silk Mulberry', creditLimit: '50000' },
      { name: 'TEST Siddaramaiah Kuruba', mobile: '9845100004', village: 'Hunsur', taluk: 'Hunsur', crops: 'Tobacco, Cotton', creditLimit: '40000' },
      { name: 'TEST Venkatesh Prasad', mobile: '9845100005', village: 'Bannur', taluk: 'T Narasipura', crops: 'Paddy, Turmeric', creditLimit: '35000' },
      { name: 'TEST Mallikarjunappa', mobile: '9845100006', village: 'Siruguppa', taluk: 'Ballari', crops: 'Cotton, Chilli', creditLimit: '60000' },
      { name: 'TEST Govinda Raju', mobile: '9845100007', village: 'Kanakapura', taluk: 'Ramanagara', crops: 'Silk Mulberry, Ragi', creditLimit: '20000' },
      { name: 'TEST Channaveere Gowda', mobile: '9845100008', village: 'Nagamangala', taluk: 'Nagamangala', crops: 'Ragi, Coconut', creditLimit: '25000' },
      { name: 'TEST Krishna Murthy', mobile: '9845100009', village: 'Malavalli', taluk: 'Malavalli', crops: 'Sugarcane, Paddy', creditLimit: '35000' },
      { name: 'TEST Somasekharaiah', mobile: '9845100010', village: 'Gubbi', taluk: 'Tumakuru', crops: 'Arecanut, Coconut', creditLimit: '40000' },
      { name: 'TEST Basavalingappa', mobile: '9845100011', village: 'Tiptur', taluk: 'Tumakuru', crops: 'Coconut, Copra', creditLimit: '30000' },
      { name: 'TEST Yallappa Hugar', mobile: '9845100012', village: 'Sindhanur', taluk: 'Raichur', crops: 'Paddy, Sunflower', creditLimit: '45000' },
      { name: 'TEST Gangadhariah B', mobile: '9845100013', village: 'Pandavapura', taluk: 'Mandya', crops: 'Sugarcane', creditLimit: '25000' },
      { name: 'TEST Chandrasekhar Reddy', mobile: '9845100014', village: 'Bagepalli', taluk: 'Chikkaballapur', crops: 'Groundnut, Maize', creditLimit: '30000' },
      { name: 'TEST Veerabhadrappa', mobile: '9845100015', village: 'Kudligi', taluk: 'Vijayanagara', crops: 'Maize, Cotton', creditLimit: '35000' },
      { name: 'TEST Doddagowda Patil', mobile: '9845100016', village: 'Bagalkot Rural', taluk: 'Bagalkot', crops: 'Sugarcane, Wheat', creditLimit: '50000' },
      { name: 'TEST Parameshwarappa', mobile: '9845100017', village: 'Channagiri', taluk: 'Davanagere', crops: 'Arecanut, Maize', creditLimit: '40000' },
    ];

    for (const c of customersToCreate) {
      const existing = await driver.evaluate(`document.body.innerText.includes(${JSON.stringify(c.name)})`);
      if (existing) {
        logStep('Customer Exists', c.name);
        continue;
      }

      await driver.clickText('Register Customer');
      await driver.waitForText('Register New Farmer / Customer');

      await driver.fillByLabel('Farmer / Customer Name *', c.name);
      await driver.fillByLabel('Mobile Number *', c.mobile);
      await driver.fillByLabel('Village / Town', c.village);
      await driver.fillByLabel('Taluk', c.taluk);
      await driver.fillByLabel('Major Crops Grown', c.crops);
      await driver.fillByLabel('Credit Limit (₹) *', c.creditLimit);

      await driver.clickText('Save Customer');
      await driver.sleep(300);
      logStep('Created Farmer Customer via UI', `${c.name} (${c.village})`);
    }

    // =========================================================================
    // PART 7: EXPAND SUPPLIERS DIRECTORY (Target: ~10-15 total)
    // =========================================================================
    console.log('\n--- EXPANDING SUPPLIERS DIRECTORY VIA UI ---');
    await driver.clickText('Suppliers');
    await driver.waitForText('Add Supplier');

    const suppliersToCreate = [
      { name: 'TEST IFFCO State Marketing Federation', mobile: '9880010001', email: 'blr@iffco.in', address: 'Cunningham Road, Bengaluru', gstin: '29AAACI0001F1Z1', terms: '30 Days Net' },
      { name: 'TEST Bayer CropScience India Agency', mobile: '9880010002', email: 'sales@bayer.in', address: 'Peenya Industrial Area, Bengaluru', gstin: '29AAACB0002F1Z2', terms: '21 Days Net' },
      { name: 'TEST Syngenta India Distribution Hub', mobile: '9880010003', email: 'hub@syngenta.in', address: 'KIADB Industrial Area, Hubli', gstin: '29AAACS0003F1Z3', terms: '15 Days Net' },
      { name: 'TEST Coromandel International Depot', mobile: '9880010004', email: 'mysuru@coromandel.biz', address: 'APMC Yard, Nanjangud Road, Mysuru', gstin: '29AAACC0004F1Z4', terms: '30 Days Net' },
      { name: 'TEST Rasi Seeds Agency Karnataka', mobile: '9880010005', email: 'rasi@rasiseeds.in', address: 'Station Road, Davanagere', gstin: '29AAACR0005F1Z5', terms: '15 Days Net' },
      { name: 'TEST Mahadhan Fertichem Wholesale', mobile: '9880010006', email: 'orders@mahadhan.in', address: 'Ring Road, Belagavi', gstin: '29AAACM0006F1Z6', terms: '30 Days Net' },
      { name: 'TEST Tata Rallis Agro Agency', mobile: '9880010007', email: 'rallis@tata.com', address: 'Industrial Suburb, Mysuru', gstin: '29AAACT0007F1Z7', terms: '30 Days Net' },
      { name: 'TEST UPL Agro Inputs Depot', mobile: '9880010008', email: 'upl@upl-ltd.com', address: 'APMC Yard, Ballari', gstin: '29AAACU0008F1Z8', terms: '21 Days Net' },
      { name: 'TEST Aries Agro Micronutrients Hub', mobile: '9880010009', email: 'aries@ariesagro.com', address: 'Rajajinagar, Bengaluru', gstin: '29AAACA0009F1Z9', terms: '15 Days Net' },
      { name: 'TEST Kaveri Seed Company Hub', mobile: '9880010010', email: 'kaveri@kaveriseeds.in', address: 'Main Road, Shivamogga', gstin: '29AAACK0010F1Z0', terms: '15 Days Net' },
    ];

    for (const s of suppliersToCreate) {
      const existing = await driver.evaluate(`document.body.innerText.includes(${JSON.stringify(s.name)})`);
      if (existing) {
        logStep('Supplier Exists', s.name);
        continue;
      }

      await driver.clickText('Add Supplier');
      await driver.waitForText('Add Fertilizer / Seed Supplier');

      await driver.fillByLabel('Supplier / Company Name *', s.name);
      await driver.fillByLabel('Mobile / Phone *', s.mobile);
      await driver.fillByLabel('Email', s.email);
      await driver.fillByLabel('Address', s.address);
      await driver.fillByLabel('GSTIN', s.gstin);
      await driver.fillByLabel('Payment Terms', s.terms);

      await driver.clickText('Save Supplier');
      await driver.sleep(300);
      logStep('Created Supplier via UI', s.name);
    }

    // =========================================================================
    // PART 8: INWARD PURCHASES / INVENTORY INCREASE (Target: 15-20 genuine transactions)
    // =========================================================================
    console.log('\n--- CREATING INWARD PURCHASES VIA UI ---');
    await driver.clickText('Purchases');
    await driver.waitForText('New Purchase Inward');

    const purchasesToCreate = [
      {
        supplierMatch: 'IFFCO',
        inv: 'PUR-IFF-2026-01',
        items: [{ prod: 'Potash', batch: 'BAT-MOP-02', exp: '2029-06-30', qty: '25', rate: '1580' }],
        paid: '39500'
      },
      {
        supplierMatch: 'Coromandel',
        inv: 'PUR-COR-2026-02',
        items: [{ prod: 'Super Phosphate', batch: 'BAT-SSP-02', exp: '2029-01-31', qty: '30', rate: '410' }],
        paid: '10000' // Partial payment
      },
      {
        supplierMatch: 'Bayer',
        inv: 'PUR-BAY-2026-03',
        items: [{ prod: 'Imidacloprid', batch: 'BAT-IMIDA-02', exp: '2028-02-28', qty: '20', rate: '335' }],
        paid: '6700'
      },
      {
        supplierMatch: 'Syngenta',
        inv: 'PUR-SYN-2026-04',
        items: [
          { prod: 'Emamectin', batch: 'BAT-EMAM-02', exp: '2028-01-31', qty: '15', rate: '315' },
          { prod: 'Sunflower', batch: 'BAT-SUN-02', exp: '2027-08-31', qty: '20', rate: '710' }
        ],
        paid: '15000'
      },
      {
        supplierMatch: 'Mahadhan',
        inv: 'PUR-MAH-2026-05',
        items: [{ prod: '19-19-19', batch: 'BAT-NPK19-02', exp: '2029-02-28', qty: '40', rate: '135' }],
        paid: '5400'
      },
      {
        supplierMatch: 'Tata Rallis',
        inv: 'PUR-RAL-2026-06',
        items: [{ prod: 'Hexaconazole', batch: 'BAT-HEXA-02', exp: '2028-04-30', qty: '12', rate: '400' }],
        paid: '4800'
      },
      {
        supplierMatch: 'UPL',
        inv: 'PUR-UPL-2026-07',
        items: [{ prod: 'Cypermethrin', batch: 'BAT-CYPER-02', exp: '2027-12-31', qty: '15', rate: '270' }],
        paid: '4050'
      },
      {
        supplierMatch: 'Rasi Seeds',
        inv: 'PUR-RAS-2026-08',
        items: [{ prod: 'Cotton', batch: 'BAT-COT-02', exp: '2027-06-30', qty: '30', rate: '775' }],
        paid: '20000'
      },
      {
        supplierMatch: 'Aries Agro',
        inv: 'PUR-ARI-2026-09',
        items: [
          { prod: 'Zinc', batch: 'BAT-ZN-02', exp: '2028-11-30', qty: '20', rate: '205' },
          { prod: 'Boron', batch: 'BAT-BOR-02', exp: '2028-12-31', qty: '25', rate: '125' }
        ],
        paid: '7225'
      },
      {
        supplierMatch: 'Kaveri',
        inv: 'PUR-KAV-2026-10',
        items: [{ prod: 'Paddy', batch: 'BAT-PAD-02', exp: '2027-05-31', qty: '35', rate: '930' }],
        paid: '30000'
      },
      {
        supplierMatch: 'IFFCO',
        inv: 'PUR-IFF-2026-11',
        items: [{ prod: 'Bio NPK', batch: 'BAT-BIONPK-02', exp: '2027-11-30', qty: '20', rate: '200' }],
        paid: '4000'
      },
      {
        supplierMatch: 'Bayer',
        inv: 'PUR-BAY-2026-12',
        items: [{ prod: 'Glyphosate', batch: 'BAT-GLYPH-02', exp: '2028-05-31', qty: '25', rate: '380' }],
        paid: '9500'
      },
      {
        supplierMatch: 'Tata Rallis',
        inv: 'PUR-RAL-2026-13',
        items: [{ prod: 'Atrazine', batch: 'BAT-ATRA-02', exp: '2027-10-31', qty: '20', rate: '185' }],
        paid: '3700'
      },
      {
        supplierMatch: 'Karnataka',
        inv: 'PUR-KAR-2026-14',
        items: [{ prod: 'Gypsum', batch: 'BAT-GYP-02', exp: '2030-06-30', qty: '40', rate: '175' }],
        paid: '7000'
      },
      {
        supplierMatch: 'Coromandel',
        inv: 'PUR-COR-2026-15',
        items: [{ prod: 'Humic Acid', batch: 'BAT-HUM-02', exp: '2029-11-30', qty: '25', rate: '235' }],
        paid: '5875'
      },
      {
        supplierMatch: 'Syngenta',
        inv: 'PUR-SYN-2026-16',
        items: [{ prod: 'Cartap', batch: 'BAT-CART-02', exp: '2028-06-30', qty: '15', rate: '440' }],
        paid: '6600'
      },
    ];

    for (const pur of purchasesToCreate) {
      const existing = await driver.evaluate(`document.body.innerText.includes(${JSON.stringify(pur.inv)})`);
      if (existing) {
        logStep('Purchase Exists', pur.inv);
        continue;
      }

      await driver.clickText('New Purchase Inward');
      await driver.waitForText('Inward Purchase & Stock Ingestion');

      await driver.selectOptionByText('form select', pur.supplierMatch);
      await driver.fillByLabel('Supplier Bill / Invoice # *', pur.inv);

      for (const item of pur.items) {
        await driver.selectOptionByText('.space-y-3 select', item.prod);
        await driver.sleep(200);
        await driver.fill('input[placeholder="Batch #"]', item.batch);
        await driver.fillByLabel('Expiry Date', item.exp);
        await driver.fillByLabel('Quantity', item.qty);
        await driver.fillByLabel('Purchase Rate (₹)', item.rate);
        await driver.clickText('Add Item');
        await driver.sleep(200);
      }

      await driver.fillByLabel('Paid Amount (₹)', pur.paid);
      await driver.clickText('Finalize Inward Purchase & Update Stock');
      await driver.sleep(500);
      logStep('Created Inward Purchase via UI', `${pur.inv} [Paid: ₹${pur.paid}]`);
    }

    // =========================================================================
    // PART 9: POS SALES BILLING (Target: 25-35 genuine invoices)
    // =========================================================================
    console.log('\n--- CREATING POS SALES INVOICES VIA UI ---');

    const salesScenarios = [
      // 1-5: Walk-in Cash Sales (varied item sizes)
      { customer: null, items: [{ q: 'Urea', count: 2 }], payment: 'cash', payVal: 0, disc: 0 },
      { customer: null, items: [{ q: 'DAP', count: 1 }, { q: 'Potash', count: 1 }], payment: 'cash', payVal: 0, disc: 20 },
      { customer: null, items: [{ q: 'Chlorpyrifos', count: 2 }, { q: 'Zinc', count: 1 }], payment: 'cash', payVal: 0, disc: 0 },
      { customer: null, items: [{ q: 'Maize', count: 3 }], payment: 'cash', payVal: 0, disc: 50 },
      { customer: null, items: [{ q: '19-19-19', count: 4 }, { q: 'Boron', count: 2 }], payment: 'cash', payVal: 0, disc: 0 },

      // 6-10: UPI / QR Code Sales
      { customer: 'Ramesh', items: [{ q: 'Cotton', count: 2 }], payment: 'upi', payVal: 0, disc: 0 },
      { customer: 'Basavaraj', items: [{ q: 'Imidacloprid', count: 1 }, { q: 'Emamectin', count: 2 }], payment: 'upi', payVal: 0, disc: 0 },
      { customer: null, items: [{ q: 'Paddy', count: 2 }, { q: 'Super Phosphate', count: 2 }], payment: 'upi', payVal: 0, disc: 0 },
      { customer: 'Shivaraj', items: [{ q: 'Urea', count: 3 }, { q: 'Potash', count: 2 }], payment: 'upi', payVal: 0, disc: 50 },
      { customer: null, items: [{ q: 'Sunflower', count: 2 }], payment: 'upi', payVal: 0, disc: 0 },

      // 11-18: Farmer Khata Credit Sales (Udhaar - Full Balance Due)
      { customer: 'Ramesh', items: [{ q: 'Urea', count: 4 }, { q: 'DAP', count: 2 }], payment: 'credit', payVal: 0, disc: 0 },
      { customer: 'Basavaraj', items: [{ q: 'Potash', count: 3 }, { q: 'Zinc', count: 2 }], payment: 'credit', payVal: 0, disc: 0 },
      { customer: 'Ningappa', items: [{ q: 'Paddy', count: 2 }, { q: '19-19-19', count: 5 }], payment: 'credit', payVal: 0, disc: 0 },
      { customer: 'Manjunath', items: [{ q: 'Urea', count: 5 }, { q: 'Super Phosphate', count: 3 }], payment: 'credit', payVal: 0, disc: 0 },
      { customer: 'Anjanappa', items: [{ q: 'Imidacloprid', count: 3 }, { q: 'Hexaconazole', count: 2 }], payment: 'credit', payVal: 0, disc: 0 },
      { customer: 'Siddaramaiah', items: [{ q: 'Cotton', count: 4 }, { q: 'Cartap', count: 2 }], payment: 'credit', payVal: 0, disc: 0 },
      { customer: 'Venkatesh', items: [{ q: 'Urea', count: 3 }, { q: 'Glyphosate', count: 2 }], payment: 'credit', payVal: 0, disc: 0 },
      { customer: 'Mallikarjunappa', items: [{ q: 'DAP', count: 3 }, { q: 'Potash', count: 2 }], payment: 'credit', payVal: 0, disc: 0 },

      // 19-24: Mixed / Partial Payment Sales (Cash + Khata Due)
      { customer: 'Govinda', items: [{ q: 'Urea', count: 2 }, { q: 'Zinc', count: 1 }], payment: 'mixed', payVal: 500, disc: 0 },
      { customer: 'Channaveere', items: [{ q: 'Maize', count: 2 }, { q: 'Boron', count: 2 }], payment: 'mixed', payVal: 1000, disc: 0 },
      { customer: 'Krishna', items: [{ q: 'Super Phosphate', count: 4 }], payment: 'mixed', payVal: 1000, disc: 0 },
      { customer: 'Somasekharaiah', items: [{ q: 'Bio NPK', count: 2 }, { q: 'Humic', count: 2 }], payment: 'mixed', payVal: 500, disc: 0 },
      { customer: 'Basavalingappa', items: [{ q: 'Gypsum', count: 3 }, { q: '19-19-19', count: 2 }], payment: 'mixed', payVal: 800, disc: 0 },
      { customer: 'Yallappa', items: [{ q: 'Sunflower', count: 2 }, { q: 'Atrazine', count: 2 }], payment: 'mixed', payVal: 1200, disc: 0 },

      // 25-28: Large Bills / Many line items (5+ items) for Print & Report Stress
      {
        customer: 'Doddagowda',
        items: [
          { q: 'Urea', count: 5 },
          { q: 'DAP', count: 2 },
          { q: 'Potash', count: 2 },
          { q: 'Chlorpyrifos', count: 1 },
          { q: 'Zinc', count: 2 },
          { q: '19-19-19', count: 3 }
        ],
        payment: 'credit',
        payVal: 0,
        disc: 100
      },
      {
        customer: 'Parameshwarappa',
        items: [
          { q: 'Maize', count: 2 },
          { q: 'Cotton', count: 2 },
          { q: 'Imidacloprid', count: 2 },
          { q: 'Hexaconazole', count: 1 },
          { q: 'Boron', count: 2 }
        ],
        payment: 'mixed',
        payVal: 3000,
        disc: 50
      },
      {
        customer: null,
        items: [
          { q: 'Gypsum', count: 2 },
          { q: 'Humic', count: 1 },
          { q: 'Bio NPK', count: 1 },
          { q: 'Zinc', count: 1 }
        ],
        payment: 'cash',
        payVal: 0,
        disc: 0
      },
      {
        customer: 'Gangadhariah',
        items: [
          { q: 'Urea', count: 3 },
          { q: 'Super Phosphate', count: 2 },
          { q: 'Glyphosate', count: 1 }
        ],
        payment: 'upi',
        payVal: 0,
        disc: 0
      }
    ];

    const DatabaseCheck = require('better-sqlite3');
    const existingCheckDb = new DatabaseCheck(qaDbPath);
    const existingSalesCount = existingCheckDb.prepare('SELECT COUNT(*) as count FROM sales').get().count;
    existingCheckDb.close();

    if (existingSalesCount >= 28) {
      console.log(`\n✓ QA Sales bills already created (${existingSalesCount} sales exist). Skipping sales bill generation.`);
    } else {
      let billIndex = 1;
      for (const sc of salesScenarios) {
        await driver.clickText('New Bill');
        await driver.sleep(300);

        // Customer Selection
        if (sc.customer) {
          await selectCustomerInPOS(driver, sc.customer);
        } else {
          await driver.clickText('Walk-in');
          await driver.sleep(200);
        }

        // Add Items
        for (const it of sc.items) {
          await addProductToCart(driver, it.q, it.count);
        }

        // Discount if any
        if (sc.disc > 0) {
          await driver.evaluate(`(() => {
            const discInput = document.querySelector('input[placeholder="0"]');
            if (discInput) {
              discInput.focus();
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (setter) setter.call(discInput, ${JSON.stringify(sc.disc.toString())});
              discInput.dispatchEvent(new Event('input', { bubbles: true }));
              discInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          })()`);
          await driver.sleep(150);
        }

        // Payment Selection
        await driver.select('select:has(option[value="cash"])', sc.payment);
        await driver.sleep(200);

        // Partial Payment value if mixed
        if (sc.payment === 'mixed' && sc.payVal > 0) {
          await driver.evaluate(`(() => {
            const lbl = Array.from(document.querySelectorAll('label')).find(l => l.innerText.includes('Paid Amount'));
            if (lbl && lbl.parentElement) {
              const input = lbl.parentElement.querySelector('input');
              if (input) {
                input.focus();
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                if (setter) setter.call(input, ${JSON.stringify(sc.payVal.toString())});
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          })()`);
          await driver.sleep(150);
        }

        // Save & Print Bill (F9)
        await driver.clickText('Save & Print Bill');
        await driver.waitForText('Finalize & Mandatory Bill Print');

        // Physical Print simulation & mark completed
        await driver.clickText('Print Bill');
        await driver.sleep(300);
        await driver.clickText('Complete & Close');
        await driver.sleep(300);

        logStep(`Created Sale #${billIndex} via UI`, `Cust: ${sc.customer || 'Walk-in'} [${sc.payment.toUpperCase()}]`);
        billIndex++;
      }
    }

    // =========================================================================
    // PART 10: CUSTOMER PAYMENTS / KHATA RECONCILIATION VIA UI
    // =========================================================================
    console.log('\n--- COLLECTING CUSTOMER KHATA PAYMENTS VIA UI ---');
    await driver.clickText('Customers');
    await driver.waitForText('Farmer Khata Ledger');

    const customerPayments = [
      { cust: 'Ramesh', amount: '2000', method: 'cash', ref: 'CASH-REC-01' },
      { cust: 'Basavaraj', amount: '3500', method: 'upi', ref: 'UPI-REC-02' },
      { cust: 'Manjunath', amount: '1500', method: 'cash', ref: 'CASH-REC-03' },
      { cust: 'Anjanappa', amount: '2000', method: 'bank_transfer', ref: 'NEFT-REC-04' },
      { cust: 'Siddaramaiah', amount: '2500', method: 'cash', ref: 'CASH-REC-05' },
      { cust: 'Govinda', amount: '300', method: 'cash', ref: 'CASH-REC-06' },
      { cust: 'Doddagowda', amount: '5000', method: 'bank_transfer', ref: 'RTGS-REC-07' },
      { cust: 'Parameshwarappa', amount: '1000', method: 'upi', ref: 'UPI-REC-08' },
    ];

    for (const cp of customerPayments) {
      // Find row for customer and click Collect
      const collectClicked = await driver.evaluate(`(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const row = rows.find(r => r.innerText.toLowerCase().includes(${JSON.stringify(cp.cust.toLowerCase())}));
        if (!row) return false;
        const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Collect'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()`);

      if (collectClicked) {
        await driver.waitForText('Collect Udhaar Payment');
        await driver.fillByLabel('Amount to Collect (₹) *', cp.amount);
        await driver.select('select:has(option[value="cash"])', cp.method);
        await driver.fillByLabel('Reference / Receipt Number', cp.ref);
        await driver.clickText('Record Payment');
        await driver.sleep(400);
        logStep('Collected Payment via UI', `${cp.cust} -> ₹${cp.amount} [${cp.method}]`);
      } else {
        logStep('Collect Not Applicable', `${cp.cust} has zero balance or not found`);
      }
    }

    // =========================================================================
    // PART 11: STOCK ADJUSTMENTS & DAMAGE DISPOSAL VIA UI
    // =========================================================================
    console.log('\n--- APPLYING STOCK ADJUSTMENTS VIA UI ---');
    await driver.clickText('Products & Stock');
    await driver.waitForText('Add Product');

    const adjustments = [
      { prod: 'MOP', type: 'damage', qty: '-2', reason: 'Torn bag moisture spoilage during rain' },
      { prod: 'Atrazine', type: 'adjustment', qty: '2', reason: 'Physical inventory recount surplus' },
      { prod: 'Copper Oxychloride', type: 'damage', qty: '-1', reason: 'Puncture leakage damaged carton write-off' },
    ];

    for (const adj of adjustments) {
      await driver.fill('input[placeholder*="Search Product"]', adj.prod);
      await driver.sleep(300);
      await driver.clickRowAction(adj.prod, 'Adjust Stock');
      await driver.waitForText('Adjust Stock');

      await driver.select('select:has(option[value="damage"])', adj.type);
      await driver.fill('input[placeholder="e.g. -5 or +10"]', adj.qty);
      await driver.fill('textarea[placeholder*="physical inventory verification"]', adj.reason);
      await driver.clickText('Apply Adjustment');
      await driver.sleep(400);
      logStep('Applied Stock Adjustment via UI', `${adj.prod}: ${adj.qty} [${adj.type}]`);
      await driver.fill('input[placeholder*="Search Product"]', '');
      await driver.sleep(200);
    }

    // =========================================================================
    // PART 12: VERIFY REPORTS & DETERMINISTIC INSIGHTS VIA UI
    // =========================================================================
    console.log('\n--- VERIFYING REPORTS & INSIGHTS ENGINE VIA UI ---');
    await driver.clickText('Reports');
    await driver.waitForText('Period Total Sales');
    await driver.waitForText('GST Tax Report');
    logStep('Reports Dashboard Verified', 'Sales, Tax, and Inventory valuations loaded');

    await driver.clickText('Insights Engine');
    await driver.waitForText('Business Intelligence & Insights Engine');
    logStep('Insights Engine Verified', 'Deterministic recommendations and category insights active');

    const Database = require('better-sqlite3');
    const reportDb = new Database(qaDbPath);
    console.log('\n--- VERIFIED QA DATABASE RECORD COUNTS ---');
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
      'audit_logs',
    ];
    for (const tbl of tables) {
      const row = reportDb.prepare(`SELECT COUNT(*) as count FROM ${tbl}`).get();
      console.log(`  ${tbl.padEnd(18)}: ${row.count}`);
    }
    reportDb.close();

    console.log('\n======================================================');
    console.log('QA DATASET EXPANSION COMPLETED SUCCESSFULLY');
    console.log('======================================================');

  } catch (err) {
    console.error('\n✗ Error during QA dataset expansion:', err);
    process.exit(1);
  } finally {
    driver.close();
  }
}

runQADataExpansion();
