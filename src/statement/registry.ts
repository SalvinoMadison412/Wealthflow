import { PageContent } from '../pdf/types';
import { parseGeneric } from './genericParser';
import { canParseKotak, parseKotak } from './kotakParser';
import { ParsedStatement } from './types';

// Bank-template registry + generic fallback, per CLAUDE.md's build order.
// Adding another bank means adding one more { canParse, parse } entry here.
const TEMPLATES: { canParse: (pages: PageContent[]) => boolean; parse: (pages: PageContent[]) => ParsedStatement }[] = [
  { canParse: canParseKotak, parse: parseKotak },
];

export function parseStatement(pages: PageContent[]): ParsedStatement {
  const template = TEMPLATES.find((t) => t.canParse(pages));
  return template ? template.parse(pages) : parseGeneric(pages);
}
