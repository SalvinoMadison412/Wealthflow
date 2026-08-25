import { ExtractResponseMessage, ExtractResult, PdfPasswordRequiredError } from './types';

type PendingRequest = {
  resolve: (result: ExtractResult) => void;
  reject: (error: Error) => void;
};

type ExtractOptions = { password?: string };

let requestCounter = 0;

// Owns request/response correlation between RN and the extraction WebView,
// keyed by requestId so concurrent calls can't cross results. Framework-free
// so it's testable without mounting a real WebView.
export class PdfExtractorBridge {
  private pending = new Map<string, PendingRequest>();
  private queued: string[] = [];
  private ready = false;

  constructor(private sendToWebView: (payload: string) => void) {}

  markReady(): void {
    this.ready = true;
    for (const payload of this.queued) this.sendToWebView(payload);
    this.queued = [];
  }

  request(base64: string, opts?: ExtractOptions): Promise<ExtractResult> {
    return new Promise((resolve, reject) => {
      const requestId = `req-${++requestCounter}`;
      this.pending.set(requestId, { resolve, reject });
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
