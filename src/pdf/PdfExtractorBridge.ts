import { ExtractResponseMessage, ExtractResult, PdfPasswordRequiredError, PdfReaderStuckError } from './types';

type PendingRequest = {
  resolve: (result: ExtractResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type ExtractOptions = { password?: string };

// A live page acks a request the moment it receives it, so a missing ack
// means the WebView is dead or still never loaded, not that the PDF is big.
// Only after the ack does the (generous) extraction ceiling apply.
const ACK_TIMEOUT_MS = 10_000;
const COLD_ACK_TIMEOUT_MS = 30_000; // page still loading its ~2MB of pdf.js
const EXTRACT_TIMEOUT_MS = 120_000;

let requestCounter = 0;

// Owns request/response correlation between RN and the extraction WebView,
// keyed by requestId so concurrent calls can't cross results. Framework-free
// so it's testable without mounting a real WebView. `onReset` lets the owner
// replace the WebView whenever the bridge gives up on it.
export class PdfExtractorBridge {
  private pending = new Map<string, PendingRequest>();
  private queued: string[] = [];
  private ready = false;

  constructor(
    private sendToWebView: (payload: string) => void,
    private onReset: (reason: string) => void = () => {}
  ) {}

  markReady(): void {
    this.ready = true;
    for (const payload of this.queued) this.sendToWebView(payload);
    this.queued = [];
  }

  // Rejects everything in flight with PdfReaderStuckError (retryable) and
  // forgets the WebView's state; the owner mounts a fresh one and calls
  // markReady() when it has loaded.
  reset(reason: string): void {
    console.warn(`[pdf] extractor reset: ${reason}`);
    this.ready = false;
    this.queued = [];
    const stale = [...this.pending.values()];
    this.pending.clear();
    for (const p of stale) {
      clearTimeout(p.timer);
      p.reject(new PdfReaderStuckError(reason));
    }
    this.onReset(reason);
  }

  request(base64: string, opts?: ExtractOptions): Promise<ExtractResult> {
    return new Promise((resolve, reject) => {
      const requestId = `req-${++requestCounter}`;
      const timer = setTimeout(
        () => this.reset(`no ack for ${requestId}`),
        this.ready ? ACK_TIMEOUT_MS : COLD_ACK_TIMEOUT_MS
      );
      this.pending.set(requestId, { resolve, reject, timer });
      const payload = JSON.stringify({
        requestId,
        type: 'extract',
        base64,
        password: opts?.password,
      });
      if (this.ready) {
        this.sendToWebView(payload);
      } else {
        this.queued.push(payload);
      }
    });
  }

  handleIncomingMessage(raw: string): void {
    let message: ExtractResponseMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    const pending = this.pending.get(message.requestId);
    if (!pending) return;

    if (message.type === 'ack') {
      clearTimeout(pending.timer);
      pending.timer = setTimeout(() => this.reset(`${message.requestId} timed out`), EXTRACT_TIMEOUT_MS);
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(message.requestId);

    if (message.type === 'result') {
      pending.resolve({ pages: message.pages });
    } else if (message.type === 'password_required') {
      pending.reject(new PdfPasswordRequiredError());
    } else {
      pending.reject(new Error(message.message));
    }
  }
}
