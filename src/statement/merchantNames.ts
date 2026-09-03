// Curated brand-name cleanup for display only — never assigns a category.
// Contains-match, case/spacing-insensitive. Internal parsing logic, not
// user-visible or user-editable (categorization rules are a separate,
// user-owned list in RulesContext).
const KNOWN_MERCHANTS: [needle: string, display: string][] = [
  ['blinkit', 'Blinkit'],
  ['mc donalds', "McDonald's"],
  ['mcdonalds', "McDonald's"],
  ['amazon pay', 'Amazon'],
  ['spotify', 'Spotify'],
  ['onecard', 'OneCard'],
  ['slice', 'Slice'],
  ['mutual fund', 'Mutual Fund SIP'],
  ['iccl mutual fu', 'Mutual Fund SIP'],
  ['safe gold', 'SafeGold'],
  ['crunchyroll', 'Crunchyroll'],
];

function normalize(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}

function titleCase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function canonicalMerchantName(raw: string): string {
  const normalized = normalize(raw);
  for (const [needle, display] of KNOWN_MERCHANTS) {
    if (normalized.includes(needle)) return display;
  }
  return titleCase(raw);
}
