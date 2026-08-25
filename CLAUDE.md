# WealthFlow

Privacy-first personal finance app: extracts and categorizes transactions
from bank statement PDFs.

## Non-negotiable architecture decisions

- **No AI/LLM parsing.** Statement extraction and categorization are fully
  deterministic (pdf.js text/layout extraction, regex-based rule matching).
  Never introduce a model into the parsing or categorization path.
- **Client-side / on-device processing only.** The raw PDF and extracted
  transactions never get uploaded anywhere by default.
- **Supabase holds only non-sensitive data**: user-defined rules, category
  definitions, preferences. Transaction data stays local (IndexedDB / SQLite)
  unless the user opts into sync, and any sync must be client-side encrypted
  before upload (Supabase should only ever see ciphertext).
- **Categorization is rule-based**: merchant regex/contains matching +
  amount-threshold rules, first-match-wins priority ordering, "Uncategorized"
  fallback bucket. No ML categorization.
- **Reconciliation is the correctness check** for parsing: opening balance +
  sum(credits) - sum(debits) should equal closing balance per statement page.

## Engineering conventions

- Apply the `ponytail` philosophy: standard library / native platform
  features before dependencies, no speculative abstractions, shortest
  correct diff.
- **Every change is its own branch + PR against `main`.** Never commit
  directly to `main`. One logical change per PR so the GitHub history stays
  reviewable.
- Use plan mode before non-trivial implementation work to agree on approach
  before code is written.

## Suggested build order

1. PDF text/layout extraction (pdf.js)
2. Bank-template parser registry + generic fallback
3. Reconciliation validator
4. Rules engine (categorization + amount rules)
5. Local storage layer (Dexie.js / sql.js)
6. Optional: client-encrypted Supabase sync for rules/preferences
