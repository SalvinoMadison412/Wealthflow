import { buildBugReport } from './bugReport';

const base = { bank: ' RBL ', unread: 3, mismatched: 2, extracted: 40, files: 1, failedFiles: 0, message: '  ' };

test('failed_count is unread + mismatched, with the split kept', () => {
  expect(buildBugReport(base)).toMatchObject({ failed_count: 5, unread_count: 3, mismatch_count: 2, rows_read: 40 });
});

test('bank is trimmed; blank becomes Unknown; empty message becomes null', () => {
  expect(buildBugReport(base)).toMatchObject({ bank: 'RBL', message: null });
  expect(buildBugReport({ ...base, bank: '' }).bank).toBe('Unknown');
});
