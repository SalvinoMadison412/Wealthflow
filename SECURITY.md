# Security policy

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub:
**Security tab > Report a vulnerability** on this repository.

Include what you found, how to reproduce it, and the impact. Never include real bank statements
or personal financial data in a report.

## Scope

- The app's on-device handling of statements and transactions (PDF extraction, parsing,
  SQLite storage)
- Sign-in and the Supabase tables (`profiles`, `categories`, `rules`) and their row-level security
- Anything that would send statement or transaction data off the device

## Not in scope

Findings that require a rooted device or physical access to an unlocked phone.

This is a solo-maintained project; reports are handled on a best-effort basis.
