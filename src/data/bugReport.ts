// Pure — unit tested directly. What "Report bug" sends: counts and the bank,
// never transactions or the PDF.
export type BugReportInput = {
  bank: string; // typed by the user, prefilled from the detected template
  unread: number;
  mismatched: number;
  extracted: number;
  files: number;
  failedFiles: number;
  message: string;
};

export function buildBugReport(i: BugReportInput) {
  return {
    bank: i.bank.trim() || 'Unknown',
    failed_count: i.unread + i.mismatched,
    unread_count: i.unread,
    mismatch_count: i.mismatched,
    rows_read: i.extracted,
    files: i.files,
    failed_files: i.failedFiles,
    message: i.message.trim() || null,
  };
}
