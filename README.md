# WealthFlow

A privacy-first personal finance app. Import a bank statement PDF and WealthFlow reads every
transaction off the page, sorts it into categories using rules you write, and shows your
spending, income, budgets and trends. **All of it happens on your phone.**

Android first, iOS planned. React Native + Expo, TypeScript.

## Why it is different

| Promise | How it is enforced |
|---|---|
| Your statements never leave the phone | PDFs are parsed in a hidden on-device WebView; transactions live only in a local SQLite database. There is no upload code path. |
| No AI reads your data | Extraction is pdf.js text positions plus regular expressions. Categorisation is user-written merchant patterns and amount thresholds, first match wins. |
| The account keeps almost nothing | Supabase stores only sign-in details, your profile, and your categories and rules. |
| Re-importing restores everything | Import is idempotent, so a new phone plus the same PDFs gives the same insights. |

These are architecture rules, not preferences. See [CLAUDE.md](CLAUDE.md).

## What you can do

- Sign in with Google, then a short onboarding profile
- Import one or several PDFs at once (password-protected ones too) and see a reconciliation check
- Browse transactions by month, category and account; categorise one or create a rule from it
- Manage priority-ordered rules; rules sync to your account
- See a budget donut and per-category monthly budgets; a Home dashboard with six-month trends
- Light, dark or system theme, plus a first-launch spotlight tour

## How it works

```
PDF  ->  hidden WebView (pdf.js)  ->  text lines  ->  bank parser  ->  reconciliation
                                                                            |
       Home / Budget / Transactions  <-  rules engine  <-  SQLite  <--------+
```

Reconciliation is the correctness check: `opening + credits - debits` must equal `closing` for
each statement. A failed check means a parser needs work.

## Tech stack

| Layer | Choice |
|---|---|
| App | React Native 0.86 + Expo SDK 57 (managed workflow), React 19, TypeScript |
| Navigation | React Navigation 7 |
| Local data | `expo-sqlite` |
| PDF extraction | `pdfjs-dist` in `react-native-webview` |
| Account backend | Supabase (Auth + three row-level-secured tables) |
| Tests | Jest (`jest-expo`) |

## Repository layout

```
App.tsx, index.ts     App root and Expo entry
src/auth/             Supabase client, session, rules sync
src/components/       Shared UI
src/data/             Pure logic: budgets, rule patterns, transfers (unit tested)
src/db/               SQLite schema, queries, matching, re-categorising
src/navigation/       Auth-gated stacks and tab bar
src/pdf/              WebView extractor and bridge
src/screens/          One file per screen
src/statement/        Bank parsers, line grouping, reconciliation
src/theme/, src/tour/ Design tokens; spotlight tour
supabase/migrations/  SQL for the account tables
design/mockups/       HTML mockups the screens were built from
docs/                 Handbook and planning docs
```

## Getting started

Prerequisites: a current Node LTS and npm; Android Studio with an emulator (no Xcode needed yet).

```bash
npm install                      # also vendors pdf.js into assets/
npx expo start --port 8081       # Metro bundler
npx expo run:android --no-bundler   # build and install on the emulator
```

Sign-in needs a Supabase project. Create `.env.local` (gitignored) with your own project's
values, then restart Metro:

```
EXPO_PUBLIC_SUPABASE_URL=<your project url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your publishable key>
```

Apply the SQL in `supabase/migrations/` to that project in order. Details, including the Google
OAuth setup, are in the [handbook](docs/ENGINEERING_HANDBOOK.md#6-backend-supabase).

Never commit real bank statements. Local test PDFs go in `fixtures/local/`, which is gitignored;
the committed fixture is synthetic.

## Testing

```bash
npx tsc --noEmit    # typecheck
npx jest            # unit tests (pure logic: parsers, rules, budgets, sync decisions)
```

Both run in CI on every pull request. Screens, SQLite and Supabase are verified by hand on the
emulator; put new decisions in pure functions so they can be tested.

## Documentation

| Read | For |
|---|---|
| [docs/ENGINEERING_HANDBOOK.md](docs/ENGINEERING_HANDBOOK.md) | Start here: how every part works, how to run and ship |
| [CLAUDE.md](CLAUDE.md) | Non-negotiable architecture decisions and conventions |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching, pull requests, review checklist |
| [SECURITY.md](SECURITY.md) | Reporting a vulnerability |
| [docs/REDESIGN_PLAN.md](docs/REDESIGN_PLAN.md) | History of the redesign, PR by PR |
| [docs/FEATURE_AUDIT.md](docs/FEATURE_AUDIT.md) | Feature audit report |

## Status

Under active development. Known gaps: only Kotak Mahindra has a bank-specific parser (others use
a generic parser and rely on reconciliation), phone OTP awaits an SMS provider, and there is no
iOS build yet. Full list in the handbook, section 9.

## Contributing and licence

Every change is a branch and pull request against `main`; see [CONTRIBUTING.md](CONTRIBUTING.md).
No licence has been chosen yet, so all rights are reserved.
