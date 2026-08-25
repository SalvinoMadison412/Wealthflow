// Vendors the pdfjs-dist build we load into the extraction WebView, so the
// checked-in copy always matches package.json's pdfjs-dist version instead
// of being hand-maintained.
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build');
const DEST_DIR = path.join(__dirname, '..', 'assets', 'pdfjs');
// Destination files use a `.pdfjs` extension (registered as a Metro asset
// type in metro.config.js) rather than `.mjs`, so Metro never tries to
// parse them as RN source and we don't have to touch its default
// `mjs` source-extension handling used across node_modules.
const FILES = [
  ['pdf.min.mjs', 'pdf.lib.pdfjs'],
  ['pdf.worker.min.mjs', 'pdf.worker.pdfjs'],
];

fs.mkdirSync(DEST_DIR, { recursive: true });
for (const [src, dest] of FILES) {
  fs.copyFileSync(path.join(SRC_DIR, src), path.join(DEST_DIR, dest));
}
console.log(`Copied ${FILES.map(([, dest]) => dest).join(', ')} to assets/pdfjs/`);
