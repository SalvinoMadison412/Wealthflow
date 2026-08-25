const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The vendored pdf.js build is read at runtime (via expo-asset +
// expo-file-system) and run inside the extraction WebView, not imported
// into the RN JS bundle — so it's registered as an opaque asset type
// under a extension no other package uses, rather than touching the
// default `mjs` source extension used across node_modules.
config.resolver.assetExts.push('pdfjs');

module.exports = config;
