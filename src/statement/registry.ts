import { PageContent } from '../pdf/types';
import { parseGeneric } from './genericParser';
import { canParseKotak, parseKotak } from './kotakParser';
import { ParsedStatement } from './types';

// Bank-template registry + generic fallback, per CLAUDE.md's build order.
// Adding another bank means adding one more { canParse, parse } entry here.
const TEMPLATES: { canParse: (pages: PageContent[]) => boolean; parse: (pages: PageContent[]) => ParsedStatement }[] = [
  { canParse: canParseKotak, parse: parseKotak },
];

// Bank name isn't part of any parser's own output (canParseKotak only
// detects the transaction-row shape) — it's attached here, alongside the
// template match, without touching a parser's internals.
const TEMPLATE_BANK_NAME: Record<number, string> = {
  0: 'Kotak Mahindra Bank',
};

export function parseStatement(pages: PageContent[]): ParsedStatement {
  const index = TEMPLATES.findIndex((t) => t.canParse(pages));
  if (index === -1) return parseGeneric(pages);
  return { ...TEMPLATES[index].parse(pages), bank: TEMPLATE_BANK_NAME[index] };
}
