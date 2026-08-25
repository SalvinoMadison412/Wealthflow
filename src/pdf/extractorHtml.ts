import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

async function readAssetAsBase64(assetModule: number): Promise<string> {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error('Failed to resolve local URI for a bundled pdf.js asset.');
  }
  return FileSystem.readAsStringAsync(asset.localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

let cachedHtml: Promise<string> | null = null;

// Builds the single self-contained HTML page loaded into the hidden
// extraction WebView. pdfjs-dist ships ESM-only builds with no relative
// imports, so both files are embedded as base64 and loaded via dynamic
// `import()` of a Blob URL — the standard way to run an ES module that
// didn't come from a real network URL.
export function buildExtractorHtml(): Promise<string> {
  if (!cachedHtml) {
    cachedHtml = load();
  }
  return cachedHtml;
}

async function load(): Promise<string> {
  const [libB64, workerB64] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    readAssetAsBase64(require('../../assets/pdfjs/pdf.lib.pdfjs')),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    readAssetAsBase64(require('../../assets/pdfjs/pdf.worker.pdfjs')),
  ]);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
  const LIB_B64 = "${libB64}";
  const WORKER_B64 = "${workerB64}";

  function post(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  let pdfjsLibPromise = null;
  function loadPdfjsLib() {
    if (!pdfjsLibPromise) {
      const libBlob = new Blob([atob(LIB_B64)], { type: 'text/javascript' });
      pdfjsLibPromise = import(URL.createObjectURL(libBlob)).then(function (pdfjsLib) {
        const workerBlob = new Blob([atob(WORKER_B64)], { type: 'text/javascript' });
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
        return pdfjsLib;
      });
    }
    return pdfjsLibPromise;
  }

  async function extractText(requestId, base64, password) {
    const pdfjsLib = await loadPdfjsLib();
    const data = base64ToBytes(base64);
    let doc;
    try {
      doc = await pdfjsLib.getDocument({ data: data, password: password }).promise;
    } catch (err) {
      if (err && err.name === 'PasswordException') {
        post({ requestId: requestId, type: 'password_required' });
        return;
      }
      post({ requestId: requestId, type: 'error', message: String((err && err.message) || err) });
      return;
    }

    try {
      const pages = [];
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber);
        const content = await page.getTextContent();
        const items = content.items.map(function (item) {
          return {
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
          };
        });
        pages.push({ pageNumber: pageNumber, items: items });
      }
      post({ requestId: requestId, type: 'result', pages: pages });
    } catch (err) {
      post({ requestId: requestId, type: 'error', message: String((err && err.message) || err) });
    }
  }

  function handleMessage(event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    if (message.type === 'extract') {
      extractText(message.requestId, message.base64, message.password);
    }
  }

  document.addEventListener('message', handleMessage);
  window.addEventListener('message', handleMessage);
</script>
</body>
</html>`;
}
