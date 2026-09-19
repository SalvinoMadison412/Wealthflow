# WealthFlow engineering handbook

The one document a new engineer reads before touching the code. It
describes what the app does, what it is built with, how every part works,
and how to run, test and ship it. Keep it current: when a PR changes
behaviour described here, update the relevant section in the same PR.

Last updated: 2026-09-19 (Transactions sort).

---

## 1. What the app does

WealthFlow is a privacy-first personal finance app for Android (iOS
planned). The user imports a bank statement PDF; the app reads every
transaction off the page, categorises it with rules the user writes, and
shows spending, income, budgets and trends.

The product promises, in the words shown on the Home screen:

> We keep just two things: your sign-in details and the rules you create.
> Your bank statements, transactions and insights live only on this phone,
> and no AI ever reads them: every transaction is sorted by fixed rules, on
> your device. Delete the app or switch phones and they're gone; re-import
> your statements and your insights come back.

Everything in the architecture follows from those promises:

| Promise | How it is enforced |
|---|---|
| Statements and transactions never leave the phone | PDF parsing runs in a hidden WebView on-device; transactions are stored only in a local SQLite database; there is no code path that uploads them. |
| No AI | Extraction is pdf.js text positions plus regular expressions. Categorisation is user-written merchant patterns and amount thresholds, first match wins. `CLAUDE.md` forbids adding a model to either path. |
| Only sign-in details and rules are kept on the account | Supabase holds three tables: `profiles`, `categories`, `rules`. Nothing else. |
| Re-importing restores insights | Import is idempotent (a transaction's `dedupe_key` is derived from its content, never from the account), and rules pulled from the account re-categorise re-imported transactions the same way. |

### User-facing flow

1. **Sign in** with Google (phone OTP is built but on hold until an SMS
   provider is configured).
2. **Onboarding**: name, email, phone, age range, monthly income range,
   main goal, occupation. Stored in the account's `profiles` row.
3. **Home**: greeting, and either a pre-import explainer (default budget
   split, what the app does) or the dashboard (net this month, six-month
   income vs expenses starting at the oldest month with data and never
   running past the current month (`chartEndMonth`), recent transactions, plus a nudge when the newest
   statement is older than 35 days).
4. **Import** (floating + button): pick one or more PDFs at once, optional
   password (asked per protected file), choose or create the account they
   belong to (one choice covers the whole pick; use an account's own Import
   button for statements from another account), see the parsed result and
   the reconciliation check. Several files show one summary: statements
   imported, transactions, new vs duplicates skipped, how many balanced,
   and any file that couldn't be read (skipped, not fatal).
5. **Transactions**: full list under a month stepper, with Received / Sent / Net
   totals for whatever is listed and a Filters button that opens a sheet (sort
   by newest / oldest / highest / lowest amount, type, recurring only, amount
   range, category; the month stays outside it, and a badge counts the active
   settings, a non-default sort included). Sorting by amount drops the day
   headers and shows each row's date instead; tap a row
   to categorise it ("just this one") or create a rule from it.
6. **Rules**: priority-ordered list; enable/disable, move up/down, delete.
   **Account filter** (Home, Transactions, Budget): with two or more
   accounts, a quiet "All accounts ▾" caption under the header opens a
   small list. The default is every account consolidated; picking one
   scopes every number on all three tabs. The choice is shared across tabs
   and kept in `settings` (`account_filter`).
7. **Budget**: spending by category for a month (donut showing the top 4
   categories plus one grey "Others" slice, with a labelled legend; the
   category list below still lists every category sorted by spend with its
   share and transaction count), optional per-category monthly budgets set
   from a small "Budget" pill on each card (no bar until a budget is set). There is no Needs/Savings split.
8. **Menu** (top-left icon): Profile, Statements, Appearance
   (light / dark / system), Take the tour, and Family (locked, with a
   note on what it will do).
9. **Profile**: account (edit profile, sign out), accounts, categories,
   income fallback, wipe all data, savings calculator.
10. **Statements**: every import with period, count and reconciliation
    badge; delete one (its transactions go, rules and categories stay).
11. **Tour**: on a device's first signed-in launch, five spotlight steps
    over Home (overview, import, categorise, rules, menu).

---

## 2. Tech stack

| Layer | Choice | Version | Why |
|---|---|---|---|
| App framework | React Native + Expo, managed workflow | Expo SDK 57, RN 0.86, React 19.2 | One codebase for Android and iOS; no custom native code required for anything the app does. Stay in managed workflow (`CLAUDE.md`). |
| Language | TypeScript, strict | TS 6.0 | |
| Navigation | React Navigation 7 (native stack + bottom tabs) | | |
| Clipboard | `expo-clipboard` | 57.x | One-tap copy of transaction details. Native module: a new dev build is needed after adding it. |
| Local database | `expo-sqlite` (native SQLite) | 57.x | Transactions, statements, accounts, rules, categories, settings. Synchronous API, change listener for reactive screens. |
| PDF extraction | `pdfjs-dist` inside a hidden `react-native-webview` | pdf.js 6.2, webview 13.16 | Cross-platform text extraction with positions, no native module. |
| Auth + account data | Supabase (Postgres + Auth) via `@supabase/supabase-js` | 2.x | Google OAuth (PKCE web flow), phone OTP, three RLS-protected tables. |
| Charts | `react-native-svg` for the donut; plain Views for bars | 15.15 | |
| Icons / fonts | `@expo/vector-icons` (Feather, AntDesign); Inter + Manrope via `expo-font` | | |
| Tests | Jest with `jest-expo` | Jest 29 | Pure logic only; see §9. |
| Backend hosting | Supabase project `wealthflow` (ref `ksnjdxjstxxaxcidkxhg`, region ap-south-1) | | Standalone; shares nothing with any other project. |

Runtime for development: Node 25, Java 17, Android SDK with an emulator.
No Xcode is required until the iOS port starts.

Non-negotiable decisions, from `CLAUDE.md`: no AI/LLM in parsing or
categorisation; on-device processing only; Expo managed workflow; Supabase
holds only non-sensitive data; categorisation is rule-based, first match
wins; reconciliation is the correctness check for parsing.

---

## 3. Repository layout

```
App.tsx                     App root: fonts, splash overlay, providers, auth gate
index.ts                    Expo entry
app.json                    Expo config (name, scheme "wealthflow", splash, plugins)
metro.config.js             Registers the vendored pdf.js files as assets
scripts/copy-pdfjs.js       postinstall: copies pdf.js build into assets/pdfjs
assets/                     Icons, splash, fonts, vendored pdf.js
supabase/migrations/        SQL for the three account tables (applied by hand, see §7)
docs/                       This handbook; REDESIGN_PLAN.md (historical PR-by-PR plan)
design/mockups/             HTML mockups the screens were built from
src/
  auth/                     Supabase client, session/profile context, rules sync
  components/               Shared UI (header, logo, splash, charts, rows, chips)
  data/                     Pure logic: budget maths, rule patterns, transfers, staleness
  db/                       SQLite: schema/migrations, queries, writes, recategorise, matching
  navigation/               RootNavigator (auth-gated stacks + tab bar with FAB)
  pdf/                      WebView extractor: HTML page, request/response bridge, provider
  screens/                  One file per screen
  statement/                Statement parsers, line grouping, reconciliation, fixtures
  theme/                    tokens.ts (palettes, spacing, radii, type), ThemeContext.tsx (useTheme/useStyles)
  tour/                     Spotlight tour: target registry, overlay, card placement
```

Conventions: pure logic lives in `src/data` and `src/statement` and is
unit tested; anything that imports `expo-sqlite` or `supabase` is not
(the native module cannot load under Jest). Screens own their styles.
No global state library; React context only for auth and the PDF
extractor.

---

## 4. Frontend: how each part works

### 4.1 App start (`App.tsx`, `src/components/LogoSplash.tsx`)

1. Native splash (plain white, from `app.json`) shows while the JS bundle
   loads.
2. `App` loads the Inter/Manrope fonts, then renders `AuthProvider` →
   `PdfExtractorProvider` → `Root`.
3. `Root` renders the navigator only once the stored session is known
   (`useAuth().loading === false`) and keeps the `LogoSplash` overlay on
   top: the W-arrow logo draws itself on (stroke-dash animation, ~1.3 s),
   holds, and only fades out once the session check is done. A returning
   user therefore never sees the login screen flash.

### 4.2 Auth gate (`src/auth/`, `src/navigation/RootNavigator.tsx`)

`RootNavigator` picks one of three stacks from `useAuth()`:

| State | Screens |
|---|---|
| No session | `Login`, `Otp` |
| Session, no profile row | `Onboarding` |
| Session + profile | `MainTabs` (Home, Transactions, Budget, Rules), `Profile`, `EditProfile`, `Statements`, `Menu` (sheet), `Import`, `NewRuleForm`, `CategorizeSheet` |

React Navigation swaps stacks automatically when `session` or `profile`
changes. The edit-profile route is deliberately named `EditProfile`, not
`Onboarding`: if both stacks used the same route name the user would stay
parked on it after finishing first-run onboarding.

`supabase.ts` creates the client with `expo-sqlite/kv-store` as session
storage (AsyncStorage-compatible, no extra dependency), PKCE flow, and
token auto-refresh only while the app is foregrounded.

- **Google**: `signInWithOAuth` with `skipBrowserRedirect`, then
  `expo-web-browser` opens the URL in a Chrome Custom Tab. The redirect
  `wealthflow://auth?code=…` closes the tab; the app exchanges the code for
  a session. No native Google SDK, so it works in Expo Go and managed
  builds. Note: React Native has no WebCrypto, so supabase-js falls back
  to the `plain` PKCE challenge method (logged as a warning in dev).
- **Phone**: `signInWithOtp({ phone })` then `verifyOtp` with the 6-digit
  SMS code. Numbers without `+` are assumed Indian (`+91`). Needs an SMS
  provider enabled in Supabase before it works.

`AuthContext.tsx` holds `{ loading, session, profile, saveProfile,
signOut }`. On a session it fetches the `profiles` row; if the network
fails it falls back to a local mirror in the `settings` table so a
returning user is not bounced through onboarding. The profile's income
range seeds the Budget income fallback once. It also starts/stops rules
sync (§6) with the session.

### 4.3 Screens (`src/screens/`)

| Screen | Data it reads | Writes it makes |
|---|---|---|
| `LoginScreen` | – | Supabase auth calls |
| `OtpScreen` | route param `phone` | `verifyOtp`, resend with 30 s cooldown |
| `OnboardingScreen` | session user metadata, existing profile | `saveProfile` (also used for edit) |
| `HomeScreen` (Net card, chart and balance card anchor on the newest month with data, not today) | `hasAnyTransactions`, `listAccounts` (staleness), `listMonthsWithData`, `getMonthSummary(month)`, `getMonthlyTotals(6, month)`, `BalanceSummary`, `listRecentTransactions(5)`, profile (all scoped by `useAccountFilter()`, see `AccountFilter.tsx`) | – |
| `ImportScreen` | `listAccounts` | `createAccount`, `renameAccount`, `importStatement` |
| `TransactionsScreen` | `listMonthsWithData`, `listCategoriesForFilter`, `listTransactions(filters)` (account via the shared filter, month, category, uncategorised, received/sent, amount range, recurring, `sort`: an `ORDER BY` picked from `SORT_SQL`); month is a Budget-style ‹ March 2026 › stepper over months with data (label taps toggle All months). Received/Sent/Net tiles sum the listed rows (transfers included). The Filters button opens a `Modal` sheet whose controls edit the screen's own filter state, so the list updates live behind it; Reset clears the sheet's filters but not the month | – |
| `CategorizeSheet` (header info button expands `TransactionDetails`: reference no., merchant, description, date, type, amount, balance after, account; tap a row or Copy all to copy) | `getTransactionDetail`, `retroCount` preview | `setCategoryOverride` ("just this one") or `insertRule` (with `suggestPattern` prefill) |
| `NewRuleFormScreen` | categories | `getOrCreateCategoryByName`, `insertRule` |
| `RulesListScreen` | `listRulesForDisplay` | `setRuleEnabled`, `moveRule`, `deleteRule` |
| `BudgetScreen` (opens on the newest month with data; stepping to a month with no transactions turns the donut into a grey ring reading "No statement" plus the month; there is no dialog) | `countTransactionsInMonth`, `countUncategorized`, `getCategoryBudgetRows` | `setCategoryBudget`, `enableAutoCategorise`, `decategorizeMonth` |
| `ProfileScreen` | profile, `listAccounts`, `listCategoriesForFilter` | `signOut`, rename/delete account, rename/recolour/delete category, `setSetting('monthly_income')`, `wipeAllData` |
| `MenuSheet` | profile, `getSetting('appearance')` | `setSetting('appearance')`, `deleteSetting('tour_done')`; `replace()`s itself with Profile or Statements |
| `StatementsScreen` | `listStatements` | `deleteStatement` |

Screens re-run their queries through `useQuery(fn, deps)`
(`src/db/useQuery.ts`), which subscribes to the SQLite change listener:
any write anywhere in the database re-renders every mounted query. This
is the entire reactivity model; there is no cache to invalidate.

### 4.4 Shared components (`src/components/`)

`AppHeader` (menu, logo, bell), `Logo` (SVG paths traced from the icon),
`LogoSplash`, `PressableScale` (animated press feedback; a single
`Animated.createAnimatedComponent(Pressable)` so the caller's layout style
applies to the children), `Amount` (INR formatting with sign and colour),
`BarChart` (paired income/expense bars, tap for values), `Donut`
(react-native-svg arcs), `TransactionRow`, `CategoryPill`, `FilterChip`,
`ProgressBar`, `SettingsRow` / `SettingsSection`, `BalanceSummary`
(opening / closing / inflows / outflows card for one month; see §5.5).

### 4.5 Theme (`src/theme/tokens.ts`, `src/theme/ThemeContext.tsx`)

`tokens.ts` holds two palettes with identical keys, `lightColors` and
`darkColors` (type `Colors`), plus `pillPaletteFor(colors, scheme)` for
the ten category tints (index 9 reserved for Uncategorized, 7 for
Transfer; dark pills are the hue as text over a 22 % wash of itself).
Spacing, radii, the type scale (one font file per weight) and
`contentWrap` are scheme-independent.

`ThemeProvider` (mounted in `App.tsx`) resolves the `appearance` setting
(`light` / `dark` / `system`, default system, reactive through `useQuery`)
against `useColorScheme()` and provides `{ scheme, colors, pillPalette }`.
Every screen and component follows one pattern:

```ts
const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({ ... });
function Screen() {
  const { colors } = useTheme();        // for inline props such as icon colours
  const styles = useStyles(makeStyles);  // memoised once per theme
  ...
}
```

Brand: emerald. Light accent `#0A8058` (5:1 against white, so button
labels pass AA; the whites and neutrals are unchanged from the original
design), dark accent `#34D399` with dark ink text (`accentText`) on it.
`inverse` is a surface that stays dark in both themes (Smart Calculator
card, snackbar); do not use `textPrimary` as a fill, it goes near-white in
dark. The quick-add button is the accent disc with a 5 px ring in the page
colour, a soft accent shadow in light and no glow in dark. The Budget donut colours its top 4
categories with their pill colour (`pillPalette[colorIndex].text`) and the
rest as one `textSecondary` "Others" slice (`topWithOthers`), flat ends and
a small gap between slices.
The Home income/expense chart (`BarChart`) draws income green and expenses
red, with the red's opacity from `expenseTone(income, expense)`
(`src/data/spending.ts`): pale at or under 50% of income, full red at 90%
or more, which also flags the month (alert icon, red label, and a red-flag
line under the chart for the newest month). Spending with no income is
flagged too. The thresholds are the tuning knob.

Never import `colors` from `tokens.ts` in a screen; the only consumers of
the fixed light palette are the splash overlay and the native launch
screen, which stay light on purpose. The navigator's theme and the status
bar also follow `scheme` (`RootNavigator`, `App.tsx`). `app.json` sets
`userInterfaceStyle: "automatic"` so Android reports the system scheme.
A test (`palette.test.ts`) pins both palettes to the same key set.

### 4.6 Spotlight tour (`src/tour/`)

`useTourTarget(name)` returns `{ ref, onLayout }`; spreading it onto a
`View`/`Pressable` registers that element's window rect under one of five
names (`greeting`, `fab`, `transactionsTab`, `rulesTab`, `menu`).
`TourOverlay` (mounted above the navigator in `App.tsx` when signed in
with a profile) shows when `settings.tour_done` is unset: after a 600 ms
layout settle it re-measures every target, dims the screen with four
absolutely positioned panels around the current target, draws an accent
ring, and places the step card below the target or above it when the
target is in the bottom third (`cardPlacement`, unit tested). Skip/Done
set `tour_done`; Menu › Take the tour deletes it to replay. Every target
is on the Home tab, so the tour never navigates and blocks touches until
finished.

---

## 5. On-device pipeline: PDF → transactions → categories

### 5.1 PDF extraction (`src/pdf/`)

`PdfExtractorProvider` mounts a 1×1 px hidden `WebView` whose HTML is
built once by `extractorHtml.ts`: the vendored pdf.js library and worker
are embedded as base64 and loaded via a Blob URL `import()`. The RN side
sends `{ requestId, type: 'extract', base64, password? }` with
`postMessage`; the page replies with `result` (an array of pages, each a
list of `{ str, x, y, width, height }` text items), `password_required`,
or `error`. `PdfExtractorBridge` matches replies to pending promises and
queues requests until the page reports ready. The PDF bytes come from
`expo-document-picker` + `expo-file-system` and never leave the device.

`scripts/copy-pdfjs.js` (postinstall) copies the pdf.js build from
`node_modules` into `assets/pdfjs/*.pdfjs`; `metro.config.js` registers
that extension as an asset so Metro never tries to parse it.

### 5.2 Statement parsing (`src/statement/`)

1. `lines.ts` clusters text items by baseline (±2 px) into text lines,
   read left to right. This is the seam that turns pdf.js positions back
   into table rows.
2. `rowParsing.ts` holds the bank-agnostic pieces: the row regex (a row
   ends in exactly two decimal numbers, amount then running balance),
   the opening-balance regex, amount and date parsing, and `inferAmounts`,
   which decides whether an amount was a withdrawal or a deposit from the
   change in running balance.
3. `registry.ts` → `parseStatement(pages)`: if `canParseKotak` recognises
   the layout, `parseKotak` runs (UPI/salary/interest description
   cleanup, `bank: 'Kotak Mahindra Bank'`); otherwise `parseGeneric`
   handles any bank with the same row shape. Adding a bank = one
   `canParseX ? parseX :` branch.
4. `merchantNames.ts` tidies merchant display names (contains-match on a
   curated list). Display only; it never assigns a category.
5. `reconciliation.ts`: `opening + Σcredits − Σdebits` must equal closing
   within ₹0.01. The result is stored per statement and shown on import.
   A failed reconciliation is the signal that a parser needs work.

### 5.3 Persistence (`src/db/`)

`db.ts` opens `wealthflow.db` once at import time, enables foreign keys,
runs migrations, and exposes `subscribeToChanges(listener, tables?)`.

`schema.ts` migrations are keyed on `PRAGMA user_version`; append a new
SQL string to `MIGRATIONS` to change the schema (v2 folded the removed
Wants bucket into Needs; v1's CHECK still allows `'wants'` because SQLite
cannot alter a CHECK without a table rebuild, so the app just never writes it; v3 added `transactions.dedupe_key` with a UNIQUE index, backfilled once at startup by `backfillDedupeKeys()` in `db.ts`, which also deletes any pre-existing duplicates). Current tables:

| Table | Purpose | Notes |
|---|---|---|
| `accounts` | A bank account the user imports into | `owner_label` defaults to "Me" (household phase 0) |
| `statements` | One row per import | `period_start/end` from first/last transaction date, `reconciled_ok`, `imported_at` |
| `transactions` | Every parsed row | id = `accountId|date|withdrawal|deposit|balance|refNo|description` (see `transactionId.ts`). `dedupe_key` (UNIQUE, no account in it: bank ref + direction + amount + date when there is a ref, else date + amounts + balance + description) means a transaction seen again, in any account, is stored once. `category_id` is the effective category, `category_override_id` a manual pin, `matched_rule_id` which rule set it, `is_transfer` |
| `categories` | User categories + two seeded reserved ones | `bucket` (unused, always 'needs'), `monthly_budget`, `color_index`, `position` |
| `rules` | Categorisation rules | `merchant_pattern` (regex or plain contains), `amount_json`, `category_id`, `enabled`, `position` (lower = higher priority) |
| `settings` | Key/value | `profile` (JSON mirror), `monthly_income`, `rules_synced_at`, `appearance`, `tour_done`, `auto_categorise`, budget preset |

`transactions.ts` holds every write (`importStatement`, `deleteStatement`,
`deleteAccount`, rule and category CRUD, overrides, `wipeAllData`). `queries.ts` holds every read the screens
use. `recategorize.ts` re-runs the rule engine over all transactions (or
one statement) and is called after any rule/category change, deferred
with `requestIdleCallback` so toggles stay smooth.

`importStatement(pages, accountId)`: parse → reconcile → insert statement
and transactions (`INSERT OR IGNORE` against the `dedupe_key` index) in one SQLite transaction →
`recategorize` the new rows → `runTransferDetection`. An import is never refused; it returns `{ added, duplicates }` and the result card says how many rows were skipped.

### 5.4 Categorisation (`src/db/matching.ts`, `src/data/rulePattern.ts`)

- A rule has an optional merchant pattern and an optional amount
  condition (`moreThan`, `lessThan`, `equalTo`, `between`). Both present
  → both must match.
- A pattern is tested against `matchText(merchant, description)`: the
  cleaned merchant plus the raw statement description. Statements truncate
  the merchant (Kotak at 15 chars) while the description keeps UPI notes
  such as `/McD` or `/Foodcharges`.
- The merchant pattern is compiled once as a case-insensitive regex; if
  it is not a valid regex it falls back to a literal contains. A plain
  word is therefore both a "contains" rule and a regex.
- Rules are evaluated in `position` order, enabled only; the first match
  wins; no match → Uncategorized. A manual override always beats rules.
- New rules are inserted at the top (`position = min − 1`) so a rule the
  user just made for a transaction wins.
- **Auto-categorise** (Budget tab, above Categories, shown while anything
  is Uncategorized) runs in the background and is **not** stored as rules:
  the Rules tab lists only rules the user wrote. Tapping it calls
  `enableAutoCategorise(month)`, which sets the local `settings.auto_categorise`
  flag and recategorises. `recategorize()` then applies, per transaction:
  manual override → user rules → built-in pattern (`findPreset` over
  `PRESET_RULES` in `src/data/autoCategorize.ts`) → Uncategorized. A
  preset match stores `matched_rule_id = 'auto'` and the transaction sheet
  says "Auto-categorised". Preset categories are created lazily, only when
  something lands in them. The flag is local (not synced); presets are not
  synced either, only the categories they create.
- **Decategorize** (Budget tab, "Decategorize <month>" beside the
  Categories title, behind a confirmation): `decategorizeMonth(month)`
  clears every manual override in that month, adds it to
  `settings.decategorized_months` (JSON array of `YYYY-MM`, see
  `src/data/decategorize.ts`) and recategorises. `recategorize()` skips
  the built-in patterns for those months, so the month is all Uncategorized
  apart from the user's own rules, which still apply and are how they build
  their own set. Auto-categorise while viewing that month removes it from
  the list and brings the patterns back. New imports into a decategorized
  month are not pattern-categorised either.
- `PRESET_RULES`: 14 categories, first match wins, order matters. Income
  first (refunds, salary, interest); Subscriptions before Shopping (Amazon
  Prime vs an Amazon order); Groceries before Food (Swiggy Instamart);
  generic keywords (cafe, kitchen, ice cream, salon, pharmacy, motors,
  residency…) as well as brands; short tokens word-bounded (`ola`, `vi`,
  `pg`). Last two are catch-alls: **Other businesses** (ventures, pvt,
  traders, BharatPe QR…) and **People & UPI** (`upi/`), because a UPI
  payment to a named person can't be categorised by regex. Measured on a
  real Kotak statement: 42% into a specific category, 100% categorised
  (the rest are person-to-person UPI). Extend the lists as statements show
  gaps; deterministic regex only, never a model.
- `suggestPattern(merchant)` proposes an escaped pattern when creating a
  rule from a transaction; `describeRule` renders the plain-language
  summary shown in lists.

### 5.5 Transfers and budgets (`src/data/`)

- `transfers.ts`: a withdrawal in one account and an equal deposit in a
  different account within two days are paired as a transfer (closest
  dates first, each leg used once). Both rows get the reserved Transfer
  category and are excluded from income/expense totals.
- `budget.ts`: the under/warning/over progress state used by
  `ProgressBar` for per-category budgets. The Needs/Savings split and its
  presets were removed; `categories.bucket` stays in SQLite and Supabase
  (always 'needs') only to avoid a table rebuild.
- `recurring.ts`: the Transactions "Recurring" filter. A merchant is
  recurring when it appears in 2+ distinct calendar months and every
  amount is within 10% of its median (rent, subscriptions, EMIs, salary).
  Needs two months of statements; there is no cadence detection.
- `balance.ts` + `getBalanceSummary(month)`: the Home and Budget balance
  card. Per account: inflows and outflows are the month's deposit and
  withdrawal sums, closing is the running balance of the chronologically
  last row (`ORDER BY date DESC, rowid DESC`; rows are inserted in
  statement order, so `rowid` breaks same-day ties), and opening is
  derived as closing - inflows + outflows, so the four numbers always
  reconcile. Accounts are then summed. Transfers are included (it is the
  account's real money movement), unlike the income/expense cards. Home
  shows the latest month that has data, not the current calendar month;
  Budget follows its month selector. An account with no rows in a month
  contributes nothing to that month's balance.
- `staleness.ts`: Home nudges to import when the newest statement's
  period end is more than 35 days ago.

---

## 6. Backend: Supabase

One standalone project, `wealthflow`
(`https://ksnjdxjstxxaxcidkxhg.supabase.co`, org "Angle", region
ap-south-1). Local config in `.env.local` (gitignored):

```
EXPO_PUBLIC_SUPABASE_URL=https://ksnjdxjstxxaxcidkxhg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key from the dashboard>
```

The key is a publishable (anon) key; all data access is protected by
row-level security, so it is safe in the client. Restart Metro after
editing `.env.local`.

### 6.1 Auth

- Providers: Google (OAuth web client in Google Cloud project
  "WealthFlow", callback `https://ksnjdxjstxxaxcidkxhg.supabase.co/auth/v1/callback`;
  the consent screen is in Testing mode, so only listed test users can
  sign in until it is published), Phone (built, provider not configured).
- Redirect URL allow-list must contain `wealthflow://auth` (and the
  `exp://…/--/auth` URL when developing in Expo Go).

### 6.2 Tables (all RLS: a user sees and edits only their own rows)

| Table | Key | Columns | Written by |
|---|---|---|---|
| `profiles` | `id` = `auth.users.id` | `full_name`, `email`, `phone`, `age_range`, `income_range`, `goal`, `occupation`, `updated_at` | Onboarding / Edit profile (`saveProfile`) |
| `categories` | `(user_id, id)` | `name`, `color_index`, `bucket`, `monthly_budget`, `position`, `updated_at` | Rules sync |
| `rules` | `(user_id, id)` | `merchant_pattern`, `amount_json`, `category_id`, `enabled`, `position`, `created_at`, `updated_at` | Rules sync |

`id` values in `categories`/`rules` are the same random strings the local
SQLite rows use, so a pull restores them verbatim and rule → category
references stay valid.

Schema SQL lives in `supabase/migrations/`. There is no migration
tooling wired up; apply new files by pasting into the dashboard SQL
editor (the MCP migration call used from Claude is blocked for tables
holding personal data). Keep the files as the record of what was applied.
`20260920000000_drop_wants_bucket.sql` (Needs/Savings only) must be run
before the Wants removal ships; until then a pull maps any `wants` row to
`needs` (`rulesSync.ts`).

### 6.3 Rules sync (`src/auth/rulesSync.ts`, `src/auth/syncDecision.ts`)

Whole-snapshot sync, because rules and categories are a few dozen rows:

- **Push**: any local write to `rules` or `categories` (caught by the
  SQLite change listener filtered by table, so no write function needs
  to know about sync) schedules a push 1.5 s later. Push = upsert all
  local categories and rules with `updated_at = now`, then delete server
  rows whose id is no longer local. On success `settings.rules_synced_at`
  is set. On failure a `dirty` flag makes it retry on the next change or
  when the app returns to the foreground.
- **Pull** on sign-in: fetch both tables and decide (`decideOnPull`):
  local empty and server empty → nothing; local empty → replace local;
  server `updated_at` newer than `rules_synced_at` → replace local;
  otherwise push local. Replacing local resets affected transactions to
  Uncategorized, swaps the rows in one SQLite transaction, then
  `recategorize('all')`.
- Nothing is pushed until the first pull has succeeded, so a fresh
  install can never blank the account. Pull writes are ignored by the
  change listener for one debounce window so they do not echo back.
- Conflict model is snapshot last-writer-wins (a `ponytail:` comment
  marks this as the known ceiling). Not synced: monthly income, budget
  preset, account nicknames.
- **Wipe all data** deletes local rules, which pushes an empty snapshot:
  the account's rules go too. **Deleting an account or statement** does
  not touch rules, which is the "re-import and insights come back" case.

---

## 7. Running, building, testing

```bash
npm install                     # also runs scripts/copy-pdfjs.js
npx expo start --port 8081      # Metro; use --clear after dependency or env changes
npx expo prebuild --platform android --no-install   # regenerate android/ (gitignored)
npx expo run:android --no-bundler                   # Gradle build + install on the emulator
npx tsc --noEmit                # typecheck
npx jest                        # tests
```

- `android/` and `ios/` are generated and gitignored; never edit them by
  hand. A change to `app.json` (scheme, splash, plugins) needs a prebuild
  and rebuild.
- Prebuild adds `ios.bundleIdentifier` to `app.json`; do not commit that
  line until the iOS port starts.
- Metro's file watcher without watchman occasionally misses edits on
  macOS; install watchman (`brew install watchman`) or restart Metro with
  `--clear`.
- Expo Go also runs the app (no native splash/scheme changes visible
  there). The debug build on an emulator is the reference environment.
- In dev, a "WebCrypto API is not supported" warning appears once per
  Google sign-in; expected.

### Tests

`npx jest` runs the pure-logic suites: statement row parsing and the
Kotak parser against a synthetic statement fixture, reconciliation,
transaction id derivation, rule matching, rule pattern suggestion,
transfer detection, budget maths, staleness, sync decision, palette key
parity, tour card placement. Screens and
anything touching SQLite or Supabase are verified by hand on the
emulator; when adding logic, put the decision in a pure function and test
that.

---

## 8. Conventions and process

- One logical change per branch and PR against `main`; never commit to
  `main` directly. Stacked PRs are fine when a change depends on an
  unmerged one; say so in the description.
- Read `CLAUDE.md` first: it is the list of decisions that are not up for
  re-litigation. `AGENTS.md` is a symlink to it.
- Prefer the platform and existing helpers over new dependencies. Every
  dependency in `package.json` is there for a reason listed in §2.
- Deliberate shortcuts with a known ceiling carry a `ponytail:` comment
  naming the ceiling and the upgrade path. Grep for them before planning
  performance or multi-device work.
- Strings shown to users make privacy claims (§1). If a change would make
  any of them untrue, change the copy in the same PR.

---

## 9. Known gaps and where to go next

- Phone OTP needs an SMS provider (Twilio or similar) enabled in Supabase.
- Google consent screen is in Testing mode; publish it before external
  users.
- Only Kotak Mahindra has a bank-specific parser; other banks go through
  the generic parser and rely on the reconciliation check to flag
  problems. Add templates as statements from other banks arrive.
- Rules sync is snapshot last-writer-wins across devices.
- No iOS build yet. Everything is cross-platform by construction; the
  work is Xcode setup, `ios.bundleIdentifier`, and the App Store splash /
  icon assets.
- Optional client-encrypted sync of monthly aggregates for households is
  designed in `docs/REDESIGN_PLAN.md` ("Household Phase 1") and not
  started. It must stay ciphertext-only on the server.
