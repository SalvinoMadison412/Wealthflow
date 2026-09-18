import { PageContent } from '../pdf/types';
import { parseGeneric } from './genericParser';
import { canParseKotak, parseKotak } from './kotakParser';
import { ParsedStatement } from './types';

// One bank template so far; add a second `canParse ? parse :` branch when
// it exists, not a registry.
export function parseStatement(pages: PageContent[]): ParsedStatement {
  if (canParseKotak(pages)) return { ...parseKotak(pages), bank: 'Kotak Mahindra Bank' };
  return parseGeneric(pages);
}
