export type TextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PageContent = {
  pageNumber: number;
  items: TextItem[];
};

export type ExtractResult = {
  pages: PageContent[];
};

export class PdfPasswordRequiredError extends Error {
  constructor() {
    super('This PDF is password-protected.');
    this.name = 'PdfPasswordRequiredError';
  }
}

// The hidden WebView stopped answering (renderer killed, page never loaded,
// extraction hung) and was restarted. Safe to retry the same request.
export class PdfReaderStuckError extends Error {
  constructor(public reason: string) {
    super('The PDF reader stopped responding. Please try again.');
    this.name = 'PdfReaderStuckError';
  }
}

type ExtractRequestMessage = {
  requestId: string;
  type: 'extract';
  base64: string;
  password?: string;
};

export type ExtractResponseMessage =
  | { requestId: string; type: 'ack' }
  | { requestId: string; type: 'result'; pages: PageContent[] }
  | { requestId: string; type: 'password_required' }
  | { requestId: string; type: 'error'; message: string };
