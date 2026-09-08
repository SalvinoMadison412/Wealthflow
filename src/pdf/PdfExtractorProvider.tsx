import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { buildExtractorHtml } from './extractorHtml';
import { PdfExtractorBridge } from './PdfExtractorBridge';
import { ExtractResult } from './types';

type PdfExtractorContextValue = {
  extractPdfText: (base64: string, opts?: { password?: string }) => Promise<ExtractResult>;
};

const PdfExtractorContext = createContext<PdfExtractorContextValue | null>(null);

export function usePdfExtractor(): PdfExtractorContextValue {
  const ctx = useContext(PdfExtractorContext);
  if (!ctx) {
    throw new Error('usePdfExtractor must be used within a PdfExtractorProvider');
  }
  return ctx;
}

export function PdfExtractorProvider({ children }: { children: React.ReactNode }) {
  const webViewRef = useRef<WebView>(null);
  const bridge = useRef(
    new PdfExtractorBridge((payload) => webViewRef.current?.postMessage(payload))
  );
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    buildExtractorHtml().then(setHtml);
  }, []);

  const value = useMemo<PdfExtractorContextValue>(
    () => ({ extractPdfText: (base64, opts) => bridge.current.request(base64, opts) }),
    []
  );

  return (
    <PdfExtractorContext.Provider value={value}>
      {children}
      {html !== null && (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={(event: WebViewMessageEvent) =>
            bridge.current.handleIncomingMessage(event.nativeEvent.data)
          }
          onLoadEnd={() => bridge.current.markReady()}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        />
      )}
    </PdfExtractorContext.Provider>
  );
}
