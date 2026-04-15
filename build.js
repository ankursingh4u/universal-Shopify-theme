const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const THEME_DIR = path.join(__dirname, 'FlexiStore');
const OUTPUT_FILE = path.join(__dirname, 'FlexiStore.zip');

// Shopify expects these folders at the root of the ZIP
const THEME_FOLDERS = [
  'assets',
  'config',
  'layout',
  'locales',
  'sections',
  'snippets',
  'templates'
];

if (fs.existsSync(OUTPUT_FILE)) {
  fs.unlinkSync(OUTPUT_FILE);
}

const output = fs.createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeKB = (archive.pointer() / 1024).toFixed(1);
  console.log(`FlexiStore.zip created (${sizeKB} KB)`);
  console.log('Upload this file to Shopify: Online Store > Themes > Add theme > Upload zip file');
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add each theme folder at the ZIP root (not nested under FlexiStore/)
for (const folder of THEME_FOLDERS) {
  const folderPath = path.join(THEME_DIR, folder);
  if (fs.existsSync(folderPath)) {
    archive.directory(folderPath, folder);
  }
}

archive.finalize();
