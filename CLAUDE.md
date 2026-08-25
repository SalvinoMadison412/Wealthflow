# WealthFlow

Privacy-first personal finance Android app: extracts and categorizes
transactions from bank statement PDFs.

## Platform

Native Android app. Assumed stack: **React Native + Expo**, matching the
Angel project's toolchain (EAS Build). Stay in Expo's managed workflow —
no custom dev client / ejecting required for anything in this doc.

## Non-negotiable architecture decisions

- **No AI/LLM parsing.** Statement extraction and categorization are fully
  deterministic. Never introduce a model into the parsing or categorization
  path.
- **On-device processing only.** The raw PDF and extracted transactions
  never get uploaded anywhere by default. This is even more natural on
  Android than it would be on web — there's no server round-trip at all
  unless the user opts into sync.
- **PDF extraction**: pdf.js running inside a hidden `react-native-webview`,
  fed the PDF bytes via `expo-document-picker` + `expo-file-system` (base64
  in, postMessage results out). This stays fully within Expo managed
  workflow — no native module compilation needed. Fallback if this proves
  insufficient: a native PDFBox-for-Android module (pdfbox-android) via a
  custom dev client — only reach for this if the WebView approach can't
  keep up, not by default.
- **Local storage**: `expo-sqlite` (native SQLite) — the Android equivalent
  of "give me real SQL for reconciliation/aggregation queries," Expo-Go
  compatible, no custom dev client needed.
- **Supabase holds only non-sensitive data**: user-defined rules, category
  definitions, preferences. Transaction data stays local (expo-sqlite)
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
  correct diff. Prefer Expo managed workflow over custom native modules
  unless a managed-workflow approach genuinely can't do the job.
- **Every change is its own branch + PR against `main`.** Never commit
  directly to `main`. One logical change per PR so the GitHub history stays
  reviewable.
- Use plan mode before non-trivial implementation work to agree on approach
  before code is written.

## Suggested build order

1. PDF text/layout extraction (pdf.js in a hidden WebView)
2. Bank-template parser registry + generic fallback
3. Reconciliation validator
4. Rules engine (categorization + amount rules)
5. Local storage layer (expo-sqlite)
6. UI screens wired to real data (see design/mockups/)
7. Optional: client-encrypted Supabase sync for rules/preferences
