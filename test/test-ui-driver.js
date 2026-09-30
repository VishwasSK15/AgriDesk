const { ElectronDriver } = require('./lib/electron-driver');
const assert = require('assert');

async function testUIDriver() {
  const driver = new ElectronDriver({ port: 9226 });
  try {
    await driver.launch();
    console.log('✓ Driver launched');

    // Ensure starting from unauthenticated state
    await driver.evaluate('localStorage.clear(); location.reload();');
    await driver.sleep(600);

    // 1. Verify Login Screen
    await driver.waitForText('AgriStore Billing');
    await driver.waitForText('Sign In to Counter');
    console.log('✓ Login screen rendered properly');

    // 2. Negative Login Test
    console.log('Testing invalid credentials...');
    await driver.fill('input[type="text"]', 'admin');
    await driver.fill('input[type="password"]', 'wrongpass');
    await driver.clickText('Sign In to Counter');
    await driver.waitForText('Incorrect password');
    console.log('✓ Invalid login error toast displayed as expected');

    await driver.sleep(1000);

    // 3. Positive Login Test
    console.log('Testing valid admin credentials...');
    await driver.fill('input[type="text"]', 'admin');
    await driver.fill('input[type="password"]', 'admin123');
    const inputVals = await driver.evaluate(`(() => ({
      u: document.querySelector('input[type="text"]')?.value,
      p: document.querySelector('input[type="password"]')?.value,
      btnDisabled: document.querySelector('button[type="submit"]')?.disabled
    }))()`);
    console.log('Input values before submit:', inputVals);
    await driver.clickText('Sign In to Counter');
    await driver.sleep(1000);
    const afterText = await driver.getBodyText();
    console.log('Page text after click:', afterText.substring(0, 300));
    await driver.waitForText('AgriStore POS');
    await driver.waitForText('Store Pulse');
    console.log('✓ Signed in successfully and reached Dashboard');

    // 4. Test Navigation to Products
    console.log('Navigating to Products & Stock...');
    await driver.clickText('Products & Stock');
    await driver.waitForText('Add Product');
    console.log('✓ Navigated to Products page');

    // 5. Test Theme Toggle
    console.log('Testing Theme Toggle...');
    const initialDark = await driver.evaluate('document.documentElement.classList.contains("dark")');
    assert.strictEqual(initialDark, false, 'Should start in light mode');
    // Click theme toggle button in TopHeader
    await driver.click('header button:has(svg.lucide-moon)');
    const isDark = await driver.evaluate('document.documentElement.classList.contains("dark")');
    assert.strictEqual(isDark, true, 'Dark class should be added to html element');
    console.log('✓ Theme toggled to Dark mode');

    // Toggle back to light
    await driver.click('header button:has(svg.lucide-sun)');
    const isLight = await driver.evaluate('document.documentElement.classList.contains("dark")');
    assert.strictEqual(isLight, false, 'Dark class should be removed');
    console.log('✓ Theme toggled back to Light mode');

    console.log('\n===========================================');
    console.log('ALL DRIVER SANITY CHECKS PASSED!');
    console.log('===========================================\n');
  } finally {
    await driver.close();
  }
}

testUIDriver().catch((err) => {
  console.error('Driver test failed:', err);
  process.exit(1);
});
