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

export type ExtractRequestMessage = {
  requestId: string;
  type: 'extract';
  base64: string;
  password?: string;
};

export type ExtractResponseMessage =
  | { requestId: string; type: 'result'; pages: PageContent[] }
  | { requestId: string; type: 'password_required' }
  | { requestId: string; type: 'error'; message: string };
