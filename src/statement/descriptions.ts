import { canonicalMerchantName } from './merchantNames';

// Bank narrations for UPI differ by bank; each shape names the payee and the
// 12-digit bank reference. Tried in order, first match wins (Axis before
// Kotak: "UPI/P2M/<ref>/..." would otherwise read "P2M" as the payee).
const UPI_SHAPES: { re: RegExp; payee: number; ref: number }[] = [
  // SBI: TO TRANSFER-UPI/DR/<ref>/<payee>/<bank>/<vpa>/<note>
  { re: /^(?:TO|BY) TRANSFER-UPI\/(?:DR|CR)\/(\d{12})\/([^/]+)/i, payee: 2, ref: 1 },
  // Axis: UPI/P2M|P2A/<ref>/<payee>/<note>/<vpa>
  { re: /^UPI\/P2[MA]\/(\d{12})\/([^/]+)/i, payee: 2, ref: 1 },
  // ICICI: UPI/<ref>/<note>/<vpa>/<bank> — no payee name, so the VPA handle
  { re: /^UPI\/(\d{12})\/[^/]*\/([^@/\s]+)@/i, payee: 2, ref: 1 },
  // HDFC: UPI-<payee>-<vpa>-<ifsc>-<ref>-<note>
  { re: /^UPI-(.+?)-\S+@\S+?-[A-Z]{4}0[A-Z0-9]{6}-(\d{12})(?:-|$)/i, payee: 1, ref: 2 },
  // Kotak: UPI/<payee>/<ref>/<note>
  { re: /^UPI\/([^/]+)\/(\d{12})\/(.*)$/, payee: 1, ref: 2 },
];
// A Kotak UPI transfer with no merchant-provided note collapses to just
// "UPI/<payee> UPI-<bankRef>" — no slash-delimited ref/note fields at all.
const UPI_SHORT_REGEX = /^UPI\/(.+?)\s+UPI-\w+$/i;

export function classifyDescription(raw: string): { merchant: string; refNo: string | null } {
  for (const { re, payee, ref } of UPI_SHAPES) {
    const m = raw.match(re);
    if (m) return { merchant: canonicalMerchantName(m[payee]), refNo: m[ref] };
  }
  const upiShort = raw.match(UPI_SHORT_REGEX);
  if (upiShort) {
    return { merchant: canonicalMerchantName(upiShort[1]), refNo: null };
  }
  if (/SALARY CREDIT/i.test(raw)) {
    return { merchant: 'Salary Credit', refNo: null };
  }
  if (/Int\.Pd/i.test(raw)) {
    return { merchant: 'Interest', refNo: null };
  }
  return { merchant: canonicalMerchantName(raw), refNo: null };
}
