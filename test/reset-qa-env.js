const fs = require('fs');
const path = require('path');

const qaDir = path.resolve(
  process.env.APPDATA
    ? path.join(process.env.APPDATA, 'AgriculturalBilling-QA')
    : path.join(__dirname, '../data-qa')
);

console.log('Explicit QA Environment Reset Tool');
console.log('Target QA Directory:', qaDir);

if (fs.existsSync(qaDir)) {
  const files = fs.readdirSync(qaDir);
  for (const file of files) {
    if (file.startsWith('agricultural_qa.db') || file === 'backups') {
      const fullPath = path.join(qaDir, file);
      try {
        if (fs.lstatSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
        console.log(`✓ Removed QA file: ${file}`);
      } catch (err) {
        console.warn(`Could not remove ${file}:`, err.message);
      }
    }
  }
  console.log('✓ QA database reset completed. The next QA run will start fresh.');
} else {
  console.log('QA directory does not exist yet. Nothing to reset.');
}
