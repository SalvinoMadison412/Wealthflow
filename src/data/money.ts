// Whole rupees in Indian grouping: ₹2,39,450. Summaries drop the paise.
export function formatRupees(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
