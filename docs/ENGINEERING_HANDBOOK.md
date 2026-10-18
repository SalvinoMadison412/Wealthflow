# WealthFlow engineering handbook

The one document a new engineer reads before touching the code. It
describes what the app does, what it is built with, how every part works,
and how to run, test and ship it. Keep it current: when a PR changes
behaviour described here, update the relevant section in the same PR.

Last updated: 2026-09-27 (Google consent screen published).

---

## 1. What the app does

WealthFlow is a privacy-first personal finance app for Android (iOS
planned). The user imports a bank statement PDF; the app reads every
transaction off the page, categorises it with rules the user writes, and
shows spending, income, budgets and trends.

The product promises, in the words shown on the Home screen:

> We keep just three things: your sign-in details, your profile and the rules you create.
> Your bank statements, transactions and insights live only on this phone,
> and no AI ever reads them: every transaction is sorted by fixed rules, on
> your device. Delete the app or switch phones and they're gone; re-import
> your statements and your insights come back.

Everything in the architecture follows from those promises:

| Promise | How it is enforced |
|---|---|
| Statements and transactions never leave the phone | PDF parsing runs in a hidden WebView on-device; transactions are stored only in a local SQLite database; there is no code path that uploads them. `android.allowBackup` is `false` in `app.json`, so Android's cloud backup and device-to-device transfer cannot copy the database off the phone either. |
| No AI | Extraction is pdf.js text positions plus regular expressions. Categorisation is user-written merchant patterns and amount thresholds, first match wins. `CLAUDE.md` forbids adding a model to either path. |
| Only sign-in details, profile and rules are kept on the account | Supabase holds three tables: `profiles`, `categories`, `rules`. Nothing else. |
| Re-importing restores insights | Import is idempotent (a transaction's `dedupe_key` is derived from its content, never from the account), and rules pulled from the account re-categorise re-imported transactions the same way. |

### User-facing flow

1. **Sign in** with Google (phone OTP is built but hidden behind
   `PHONE_SIGN_IN_ENABLED` in `LoginScreen` until an SMS provider is configured).
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
5. **Transactions** lists every transaction of the month by default (Basic).
   With **Advanced Access** on (Menu > Features, `advanced_access` setting,
   off by default) it is a review inbox: imported transactions stay here until
   finalized (the user picks a category in the sheet, or taps Confirm). An
   **All imports** | **By rules** switch (each with a count) sits under a month
   stepper; By rules lists only rule or auto-categorised rows and has Confirm
   all. Rows with a category carry a Confirm button; paired transfers never
   appear. Finalized transactions leave the list and live in Reports. Received /
   Sent / Net totals follow whatever is listed, and a Filters button opens a
   sheet (sort by newest / oldest / highest / lowest amount, type, recurring
   only, amount range; the month stays outside it, and a badge counts the
   active settings, a non-default sort included). Sorting by amount drops the day
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
   income fallback, wipe all data, savings calculator. Tapping a category
   edits its name, colour and type (Income / Expense / Asset / Liability).
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
  provider enabled in Supabase before it works, so the Login screen hides it
  (`PHONE_SIGN_IN_ENABLED = false`).
- **Guest**: "Continue as guest" calls `signInAnonymously()`. The anonymous
  user has a real session and `auth.uid()`, so onboarding, profile, rules sync
  and delete-account run unchanged. It exists so Play reviewers and testers can
  use the whole app without a Google account (Play "Sign-in details": nothing
  restricted). A guest account can't be signed back into, so Profile > Sign
  out warns guests first (`session.user.is_anonymous`). Upgrading a guest to
  Google (`linkIdentity`) is not built.

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
| `HomeScreen` (the shared `PeriodStepper` picks the period for the Net and balance cards; a whole-year period sums the year in Net and hides the balance card. Its "Change year in Filters" note opens Transactions with the Filters sheet up. The chart stays a 6-month trend and Recent stays the latest 5, whatever the month) An "Owed" card (two columns, Owed to you / You owe, each with a total and a head-count) sits under the chart and renders only while an unsettled entry exists (`getOwedSummary`); a column opens `OwedScreen` on that side. | `hasAnyTransactions`, `listAccounts` (staleness), `usePeriod`, `getMonthSummary(period)`, `getMonthlyTotals(6, month)`, `BalanceSummary`, `listRecentTransactions(5)`, profile (all scoped by `useAccountFilter()`, see `AccountFilter.tsx`; there is no account dropdown on any tab: while one account is picked, a small removable "Kotak · XX9876 ✕" chip (`AccountChip`) sits under the period note on Home and Transactions and under the header on Budget; the text opens the Filters sheet, the ✕ shows all accounts) | – |
| `ImportScreen` | `listAccounts` | `createAccount`, `renameAccount`, `importStatement` |
| `TransactionsScreen` | `getSetting('advanced_access')`: off passes no `view` (every transaction, transfers included) and hides the segment, Confirm and Confirm all; `listTransactions(filters)` (account via the shared filter, the shared period (`usePeriod`) (a `date >= ? AND date < ?` range from `periodRange`, so `idx_transactions_date` is used; never `strftime` on the column), `view` (`all` = inbox: `category_override_id IS NULL AND is_transfer = 0`; `byRules` adds `matched_rule_id IS NOT NULL`), received/sent, amount range, recurring, `sort`: an `ORDER BY` picked from `SORT_SQL`), `countInbox(period, accountIds)` for the segment counts; the period comes from `PeriodStepper` (shared with Home). The Filters sheet's first section is ACCOUNT (radio rows: All accounts and each account; only with 2+ accounts; it counts as one filter and Reset clears it); the shared account setting is global, so Home, Budget and Transactions all follow it. YEAR comes next and jumps to that year's newest month. The `openFilters` route param (a timestamp) opens the sheet; Home's note sends it. There is no title row: one row holds the `PeriodStepper` on the left (its `trailing` slot) and two 44dp icon buttons on the right, search and Filters (the Filters count is a small badge on its icon). The search icon opens a "Search merchant" field (debounced 300 ms) that sets `search`: `t.merchant LIKE ? ESCAPE '\' OR t.description LIKE ? ESCAPE '\'` with `containsPattern` (`data/likePattern.ts`) escaping `%`, `_` and `\`, so partial names match case-insensitively (ASCII) and it ANDs with the period, account and Filters; the empty state offers Clear search. A single 13px line, "In ₹2,39,450 · Out ₹4,76,895 · Net −₹2,37,445" (`formatRupees`, whole rupees; Net coloured), sums the listed rows (transfers included). Rows show the category as plain grey text under the merchant, and nothing for Uncategorized; when the period has uncategorized rows (`countUncategorizedIn`) one quiet row "42 uncategorized · Review ›" narrows the list to them (`uncategorizedOnly`). Day headers read "Wed 30 Sep" with no daily total. The Filters button opens a `Modal` sheet whose controls edit the screen's own filter state, so the list updates live behind it (amount boxes are debounced 300 ms); Reset clears the sheet's filters but not the period | `finalizeTransactions` (row Confirm, Confirm all) |
| `CategorizeSheet` (header info button expands `TransactionDetails`: reference no., merchant, description, date, type, amount, balance after, account; tap a row or Copy all to copy) | `getTransactionDetail`, `retroCount` preview | `setCategoryOverride` ("just this one", which also finalizes the row) or `insertRule` (with `suggestPattern` prefill) then `setCategoryOverride`. A Type control (Income / Expense / Asset / Liability) filters the category grid by `kind`; its default is the current category's kind, else deposit -> income, withdrawal -> expense. Uncategorized is not offered. A type with no matching category offers a general one (`Income`, `Expenses`, `Assets`, `Liabilities`), created on tap. A "Split or owed" section (`OwedSection`) below the categories: None / Owed to you / You owe (default by sign: debit -> owed to you), a person and an amount per entry (amount defaults to the full transaction), "Add another person" for split bills; `validateOwedSplit` requires a name, each amount > 0 and the sum <= the transaction; Save calls `saveOwed`, which replaces that transaction's entries |
| `NewRuleFormScreen` (a Merchant / Amount switch picks the one condition the rule saves; Merchant takes a comma-separated list, with an info button explaining that case is ignored) | categories | `getOrCreateCategoryByName`, `insertRule` |
| `RulesListScreen` | `listRulesForDisplay` | `setRuleEnabled`, `moveRule`, `deleteRule` |
| `BudgetScreen` (opens on the newest month with data; stepping to a month with no transactions turns the donut into a grey ring reading "No statement" plus the month; there is no dialog; a partly covered month reads "spent in 15 of 31 days") | `countTransactionsInMonth`, `countUncategorized`, `getCategoryBudgetRows` | `setCategoryBudget`, `enableAutoCategorise`, `decategorizeMonth` |
| `ProfileScreen` | profile, `listAccounts`, `listCategoriesForFilter` | `signOut`, `deleteAccount` (auth context: `delete_my_account()` RPC, local sign-out, then `wipeAllData`; typed-DELETE confirm), rename/delete account, rename/recolour/retype/delete category, `setSetting('monthly_income')`, `wipeAllData` |
| `MenuSheet` | profile, `getSetting('appearance')`, `getSetting('advanced_access')` | `setSetting('appearance')`, `setSetting('advanced_access')` (Advanced Access switch), `deleteSetting('tour_done')`; `replace()`s itself with Profile or Statements |
| `OwedScreen` (root stack; params `{ side? }`) | `listOwed(direction, accountIds)`, `groupByPerson` | `settleOwed`: rows grouped by person (case-insensitive), outstanding first; each unsettled row has a 40dp Settle button, settled rows show "✓ Settled" and sink; a total line and empty states |
| `StatementsScreen` (gaps between one account's statements are listed above the cards: "missing 16–19 Sept") | `listStatements`, `gapsBetween` | `deleteStatement` |

**Shared period (Home + Transactions).** `components/PeriodStepper.tsx`
holds one in-memory period (`useSyncExternalStore`, reset each launch):
none = newest month with data, `'YYYY-MM'`, or `'YYYY'` for a whole year
(`data/period.ts` `resolvePeriod`). `<PeriodStepper>` is the ‹ October 2026 ›
row; it steps through every month with data, crossing years, and tapping the
label toggles "All of 2026". Below it, a small note ("Change year in Filters")
opens the Transactions Filters sheet. There is no all-time view.

**Partial months.** `data/coverage.ts` merges each account's statement
periods (`listStatements`) into covered day ranges. `monthCoverage` gives, per
account with a statement in that month, the covered and missing days; days
from today on are never missing. `useCoverage(month)` (PeriodStepper.tsx)
feeds:
- the note: "Covers 1–15 Oct" or "Missing 16–19 Sept" (whichever is
  shorter), or "Some days missing" when several accounts are partial;
- the ⓘ button beside it, which opens a sheet with each account's covered
  and missing days, the statements behind the period, "Import missing days"
  and "Change year";
- the Home chart (partial months faded; the summary line says "October so
  far");
- Budget ("spent in 15 of 31 days");
- Home's nudge, which also fires once the newest month has ended with days
  missing ("Import 16–31 Oct to complete October").
`gapsBetween` lists holes between one account's statements at the top of the
Statements screen. Totals are never pro-rated: they show only what's covered.

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
Transfer; dark pills are the hue as text over a 14 % wash of itself).
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

Palette ("Fresh tint"): cool-tinted neutrals. Light page `#F6F8FA` on
white cards, secondary text `#566270`, income text `#166534`. Dark page
`#0E1214` with `#161B1F` cards and `#98A2AD` secondary text. The Home net
card uses the `summaryBg` token (light `#E3F3EC`, dark `#11302A`); every
text pair on it is at least 4.5:1.

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
or more. There is no banner and no per-bar warning icon: one quiet grey line
above the bars (13px `textSecondary`) says "Spent 199% of income in
September" for the newest month with data ("No income in September" when
there was none; "September so far (1–15): spent 62% of income" for a partial
month). The red stays on the bars. The thresholds are the tuning knob.

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

**Recovery.** The WebView lives for the whole app session, and Android can
kill its renderer while the app is backgrounded (react-native-webview
reports this as `onRenderProcessGone`). The page therefore replies `ack`
the moment it receives a request. The bridge treats no ack within 10 s
(30 s while the page is still loading) as a dead WebView, and no result
within 120 s of the ack as a hung extraction. Either case, or
`onRenderProcessGone`, calls `bridge.reset()`: pending requests reject
with `PdfReaderStuckError`, the provider bumps `attempt` (the WebView's
`key`) to mount a fresh one, and `extractPdfText` retries the request once
before the error reaches the user. A failed HTML build is not cached, so
the remount rebuilds it.

`scripts/copy-pdfjs.js` (postinstall) copies the pdf.js build from
`node_modules` into `assets/pdfjs/*.pdfjs`; `metro.config.js` registers
that extension as an asset so Metro never tries to parse it.

### 5.2 Statement parsing (`src/statement/`)

1. `lines.ts` clusters text items by baseline (±2 px) into text lines,
   read left to right. This is the seam that turns pdf.js positions back
   into table rows.
2. `rowParsing.ts` → `parseRow(line)` reads one transaction row by shape,
   not by bank: `[serial] date [value date] description [ref] amount
   balance [branch code]`, or `date amount balance description` (PNB-style).
   Dates: `d Mon yyyy`, `dd-Mon-yyyy`, `dd/mm/yy`, `dd/mm/yyyy`,
   `dd-mm-yyyy` (day before month). A `Dr`/`Cr` after an amount is
   dropped; a `Dr` on the balance means overdrawn (negative). Lines that
   do not start with a date (headers, summaries, footers) are not rows.
   `inferAmounts` decides withdrawal vs deposit from the change in
   running balance, so the Dr/Cr suffix is never trusted for direction.
3. `columns.ts` reads a statement **by its table columns** when it finds a
   header line (narration/particulars/description, withdrawal/debit,
   deposit/credit, balance). A row is everything from one date in the date
   column down to the next (narrations wrap over 2-4 lines and amounts can
   sit a few points off the date's baseline). An amount's column, matched
   by right edge to the header label, says withdrawal, deposit or balance.
   Columns carry to later pages (HDFC prints the header once). A row band
   ends at the next date, a line starting in the date column, or summary
   text ("statement summary", "opening balance", "generated on"...).
   **Without a recognised header** (unusual or Hindi labels, no header, one
   Amount column plus a Dr/Cr type), `columnSearch.ts` finds the columns from
   the numbers: amounts with two decimals are grouped by right edge, and
   again by left edge for left-aligned columns (the six busiest groups each),
   and every role assignment is tried: separate
   withdrawal/deposit/balance columns, or one amount column whose direction
   comes from a Dr/Cr marker or a minus sign. A reading is accepted only if
   it chains at least 4 rows and 90% of all rows, beats every other reading
   by max(2, 10% of rows), and ends on a printed closing balance when the
   statement has one. Identical readings count once. Dated lines with no
   amounts above the table (a statement period) are not rows. Otherwise the
   line reader below takes over. `coverage.layout` records which path read
   the statement (`header`, `search`, `lines`). A separate Dr/Cr (or
   DEBIT/CREDIT) cell belongs to the nearest amount on the same line within
   130pt, either side (IDBI prints it left, PNB right). Amounts may carry a
   ₹/Rs/INR prefix, and a 0.00 in the empty Withdrawal/Deposit cell is
   ignored.
   **Coverage:** every parse returns `coverage = { rowsInPdf, rowsRead,
   unreadDates, mismatchDates }`. `rowsInPdf` counts dated rows on the page;
   a row is unread when its amounts are missing or ambiguous; a mismatch is a
   row whose balance does not equal previous balance - withdrawal + deposit.
   `coverage.verified` is true only on the column path: the line reader
   works out withdrawal vs deposit from the balance change, so its rows
   always "follow" and its imports are shown as **unverified**, never
   Balanced. Brought/carried-forward rows ("B/F", "C/F", "Balance
   forward", a dated "Opening/Closing Balance" row) are not transactions:
   they seed the balance chain and are not counted. A statement whose first
   row is later than its last (newest first) is read bottom-up.
   The import result card lists all of this, and `statements.reconciled_ok`
   is only true when totals reconcile, the read is verified and coverage is
   complete. The opening balance
   comes from the statement, or from row 1 (balance + withdrawal - deposit).
   The description stays the anchor line's text as the line reader reads it,
   so ids and dedupe keys do not change; wrapped narration lines are not
   stored yet.
4. `genericParser.ts` is the only parser. It also reads the opening
   balance, on the same line as its label or (HDFC-style summary block)
   on the next line. `descriptions.ts` turns a narration into a merchant
   and bank reference: UPI shapes for Kotak, SBI, HDFC, ICICI and Axis,
   plus salary/interest keywords. `registry.ts` → `parseStatement(pages)`
   adds `bank`, taken from a bank name in the lines that are **not**
   transaction rows (narrations mention other banks); none found means
   `bank` is `undefined` and the user types it in the account chooser.
   It also adds `period`, the statement period the bank prints ("Statement
   period 01-10-2026 to 15-10-2026", "From … To …"; `matchPeriod`), searched
   in the same non-row lines and kept only if every row date falls inside
   it. `importStatement` saves it as `period_start/end`, falling back to the
   first and last row dates.
   `description` feeds the transaction id and `dedupe_key`, so changing
   how it is built re-imports as new rows: Kotak output is pinned (the
   real sample statement was diffed field by field before and after).
   Known gaps: narrations wrapped onto a second line lose the second
   line; the Chq/Ref column is kept in the description; merchant names
   are only extracted for the UPI shapes above; credit-card statements
   and statements without a running balance are not supported. The other
   banks' layouts in `fixtures/syntheticBanks.ts` are from memory of
   public formats; confirm against real (redacted) statements.
5. `merchantNames.ts` tidies merchant display names (contains-match on a
   curated list). Display only; it never assigns a category.
6. `reconciliation.ts`: `opening + Σcredits − Σdebits` must equal closing
   within ₹0.01. The result is stored per statement and shown on import.
   A failed reconciliation is the signal that a parser needs work.

### 5.3 Persistence (`src/db/`)

`db.ts` opens `wealthflow.db` once at import time, enables foreign keys,
runs migrations, and exposes `subscribeToChanges(listener, tables?)`.

`schema.ts` migrations are keyed on `PRAGMA user_version`; append a new
SQL string to `MIGRATIONS` to change the schema (v2 folded the removed
Wants bucket into Needs; v1's CHECK still allows `'wants'` because SQLite
cannot alter a CHECK without a table rebuild, so the app just never writes it; v3 added `transactions.dedupe_key` with a UNIQUE index, backfilled once at startup by `backfillDedupeKeys()` in `db.ts`, which also deletes any pre-existing duplicates; v4 added `categories.kind` and backfilled it from the category name via `defaultKind`; v5 added `owed`). Current tables:

| Table | Purpose | Notes |
|---|---|---|
| `accounts` | A bank account the user imports into | `owner_label` defaults to "Me" (household phase 0) |
| `statements` | One row per import | `period_start/end` from first/last transaction date, `reconciled_ok`, `imported_at` |
| `transactions` | Every parsed row | id = `accountId|date|withdrawal|deposit|balance|refNo|description` (see `transactionId.ts`). `dedupe_key` (UNIQUE, no account in it: bank ref + direction + amount + date when there is a ref, else date + amounts + balance + description) means a transaction seen again, in any account, is stored once. `category_id` is the effective category, `category_override_id` a manual pin, `matched_rule_id` which rule set it, `is_transfer` |
| `categories` | User categories + two seeded reserved ones | `bucket` (unused, always 'needs'), `monthly_budget`, `color_index`, `position`, `kind` (`income`/`expense`/`asset`/`liability`; NULL only for Uncategorized; v4) |
| `owed` | Money someone owes you (`to_me`) or you owe (`by_me`), tagged on a transaction | `transaction_id`, `direction`, `person`, `amount` (can be part of the transaction: a split bill has several rows), `settled_at` (NULL = outstanding). A note only: spending totals, charts, budgets and reconciliation never read it. Local only. `deleteStatement`, `deleteAccount` and `wipeAllData` delete its rows first |
| `rules` | Categorisation rules | `merchant_pattern` (comma-separated terms, each a regex or plain contains), `amount_json`, `category_id`, `enabled`, `position` (lower = higher priority) |
| `settings` | Key/value | `profile` (JSON mirror), `monthly_income`, `rules_synced_at`, `appearance`, `tour_done`, `auto_categorise`, `advanced_access`, budget preset |

`transactions.ts` holds every write (`importStatement`, `deleteStatement`,
`deleteAccount`, rule and category CRUD, overrides, `wipeAllData`). `queries.ts` holds every read the screens
use. `recategorize.ts` re-runs the rule engine over all transactions (or
one statement) and is called after any rule/category change, deferred
with `requestIdleCallback` so toggles stay smooth.

`importStatement(pages, accountId)`: parse → reconcile → insert statement
and transactions (`INSERT OR IGNORE` against the `dedupe_key` index) in one SQLite transaction →
`recategorize` the new rows → `runTransferDetection`. The one refusal is a PDF that parses to zero transactions (scanned or an unsupported layout): it throws `NO_TRANSACTIONS_MESSAGE` before anything is written, and `ImportScreen` reports the file as unreadable instead of showing a "Balanced" result (0 + 0 = 0) or asking which account it belongs to. Otherwise an import returns `{ added, duplicates }` and the result card says how many rows were skipped.

### 5.4 Categorisation (`src/db/matching.ts`, `src/data/rulePattern.ts`)

- **Finalized** = `category_override_id IS NOT NULL` (or `is_transfer = 1`);
  a rule match alone is not finalized. `setCategoryOverride` pins a
  transaction (picking Uncategorized instead clears the pin and re-runs the
  rules) and `finalizeTransactions(ids)` pins each row to the category it
  already has, skipping Uncategorized. Creating a rule from the sheet also
  pins that row.
- Every category has a `kind` (`src/data/statements.ts`): income, expense,
  asset or liability; Uncategorized alone has none. Each `PresetRule`
  carries one (Income → income, Investments → asset, Credit card & loans →
  liability, the rest expense), `defaultKind(name)` maps a bare name the
  same way, and `getOrCreateCategoryByName(name, kind)` requires it.
  `insertRule` reuses an existing category's kind. The user changes it in
  Profile > Categories.
- A rule has an optional merchant pattern and an optional amount
  condition (`moreThan`, `lessThan`, `equalTo`, `between`). Both present
  → both must match. The New Rule form saves one or the other, never both.
- A pattern is tested against `matchText(merchant, description)`: the
  cleaned merchant plus the raw statement description. Statements truncate
  the merchant (Kotak at 15 chars) while the description keeps UPI notes
  such as `/McD` or `/Foodcharges`.
- The merchant pattern is a comma-separated list of terms
  (`Swiggy, Zomato`); the rule matches when any term does. Each term is
  compiled once as a case-insensitive regex; if it is not a valid regex
  it falls back to a literal contains. A plain word is therefore both a
  "contains" rule and a regex. A comma always separates, so a term
  cannot contain one.
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
  project id `wealthflow-509015`; the consent screen is published (In
  production), so any Google account can sign in. Scopes are the default
  non-sensitive openid/email/profile and there is no logo, so no Google
  verification is needed; adding a logo or sensitive scopes would require it),
  Phone (built, provider not configured), Anonymous (guest; needs
  Authentication > Sign In / Providers > "Allow anonymous sign-ins" on).
- Redirect URL allow-list must contain `wealthflow://auth` (and the
  `exp://…/--/auth` URL when developing in Expo Go).

### 6.2 Tables (all RLS: a user sees and edits only their own rows)

| Table | Key | Columns | Written by |
|---|---|---|---|
| `profiles` | `id` = `auth.users.id` | `full_name`, `email`, `phone`, `age_range`, `income_range`, `goal`, `occupation`, `updated_at` | Onboarding / Edit profile (`saveProfile`) |
| `categories` | `(user_id, id)` | `name`, `color_index`, `bucket`, `monthly_budget`, `position`, `kind`, `updated_at` | Rules sync |
| `rules` | `(user_id, id)` | `merchant_pattern`, `amount_json`, `category_id`, `enabled`, `position`, `created_at`, `updated_at` | Rules sync |
| `bug_reports` | `id` | `user_id` (default `auth.uid()`), `bank`, `failed_count`, `unread_count`, `mismatch_count`, `rows_read`, `files`, `failed_files`, `message`, `app_version`, `platform`, `created_at` | Import "Report bug" (insert only; read in the dashboard) |

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
`20261003000000_category_kind.sql` (adds `categories.kind`) must be run
before the build that syncs `kind` ships, or pushes will fail; a null `kind`
on pull falls back to `defaultKind(name)`.

### 6.2b Deleting an account

`supabase/migrations/20260925000000_delete_my_account.sql` adds
`public.delete_my_account()` (`security definer`, executable by `authenticated`
only). It deletes the caller's `auth.users` row, and `profiles`, `categories`
and `rules` go with it via `on delete cascade`. The app (`deleteAccount` in
`AuthContext`) calls it first, and only on success signs out locally and runs
`wipeAllData`, so a failure leaves everything intact. Needed for Play's
account-deletion policy; public instructions are in `docs/DELETE_ACCOUNT.md`.
Apply the migration by hand like the others (§6.2).

### 6.2c Import bug reports

When an import leaves rows unread or mismatched (or a file unreadable), the
result card (`ImportScreen.tsx` `ReportBug`) says it will be fixed within 48
hours and offers **Report bug**: bank (prefilled from the detected template,
editable, since unknown banks have none), an optional note, and a plain
statement of what is sent. `src/data/bugReport.ts` builds the row (counts and
bank only, never transactions or the PDF); `src/auth/bugReport.ts` inserts it.
`failed_count` = unread + mismatched rows. RLS allows insert only, for the
caller's own `user_id`; guests (anonymous auth) can report. Apply
`supabase/migrations/20261018000000_bug_reports.sql` by hand (§6.2) before the
build ships, or sends show "Couldn't send".

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
  `recategorize('all')`. It also clears manual
  overrides, so a pull un-finalizes transactions (known limit, see §9).
- Categories sync their `kind` with the rest of the row.
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
- `android.blockedPermissions` in `app.json` strips storage and
  draw-over-other-apps permissions that libraries merge in but the app
  never uses (the document picker needs no storage permission). Check
  `android/app/src/main/AndroidManifest.xml` after adding a native
  dependency.
- Metro's file watcher without watchman occasionally misses edits on
  macOS; install watchman (`brew install watchman`) or restart Metro with
  `--clear`.
- Expo Go also runs the app (no native splash/scheme changes visible
  there). The debug build on an emulator is the reference environment.
- In dev, a "WebCrypto API is not supported" warning appears once per
  Google sign-in; expected.

### Continuous integration

`.github/workflows/ci.yml` runs `npm ci`, `npx tsc --noEmit` and `npx jest` on every
pull request and push to `main`. The job is named `test`; that name is the required status check in
`main`'s branch protection (PR required, no force push, no deletion), so renaming the job means
updating the protection rule. Dependabot opens weekly grouped minor/patch PRs and skips major
`expo*`, `react-native*` and `react` bumps (Expo SDK upgrades are done deliberately, together).

### Releasing

`eas.json` defines `preview` (installable APK) and `production` (AAB, remote
versionCode auto-increment, submit to Play's internal track). Steps, EAS environment
variables (`.env.local` is not uploaded to EAS), Data safety answers and the
production blockers are in `docs/RELEASING.md`.

The Android package is `com.kevin.madison.wealthflowapp`. The first Play app
(`com.kevin.madison.wealthflow`) was deleted on 2026-10-14 and that ID can never be
reused; the URL scheme (`wealthflow://auth`) and the EAS project are unchanged.

### Tests

`npx jest` runs the pure-logic suites: statement row parsing and the
Kotak parser against a synthetic statement fixture, reconciliation,
transaction id derivation, rule matching, rule pattern suggestion,
transfer detection, budget maths, staleness, sync decision, palette key
parity, tour card placement. Screens and
anything touching SQLite or Supabase are verified by hand on the
emulator; when adding logic, put the decision in a pure function and test
that.

### E2E testing (Maestro)

`.maestro/` holds [Maestro](https://maestro.mobile.dev) flows that drive the
installed app through its UI; they use visible text and accessibility
labels (no `testID`s), so the same YAML should work on iOS later.

| Flow | Checks |
|---|---|
| `launch.yaml` | fresh install → Continue as guest → profile → Home |
| `import-valid.yaml` | imports `fixtures/synthetic-statement.pdf` (its header names the bank, which the account chooser pre-fills; a statement that names none leaves the bank field blank): 6 transactions, "Balanced", rows on Transactions |
| `import-zero-row.yaml` | imports `fixtures/not-a-statement.pdf`: must be rejected, not shown as a balanced import (fails on a build without that fix) |

Both PDFs are made-up data; never commit a real statement. Shared steps live
in `subflows/`.

Prerequisites: Maestro installed (`maestro --version`), a booted emulator
(AVD `Pixel_10`), and a **release** build of the app installed so no Metro
is needed (`ANDROID_HOME=~/Library/Android/sdk npx expo run:android --variant release --no-bundler`; it needs `.env.local`
for the Supabase guest sign-in, so the flows need network). Each run starts with `clearState`, so it wipes the app's data on the
emulator. Put the PDFs where the document picker can see them, and make
Android index them (otherwise the picker does not list them):

```bash
adb push .maestro/fixtures/*.pdf /sdcard/Download/
for f in synthetic-statement.pdf not-a-statement.pdf; do adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/$f; done
maestro test .maestro/
```

The import flows tap through the system file picker (`Show roots` →
`Downloads`), so they depend on the emulator's Android picker UI. Not wired
into CI.

---

## 8. Conventions and process

- One logical change per branch and PR against `main`; never commit to
  `main` directly. Stacked PRs are fine when a change depends on an
  unmerged one; say so in the description.
- `CONTRIBUTING.md` is the short version of this section for newcomers; keep them
  consistent.
- PRs use `.github/pull_request_template.md`; issues use the forms in `.github/ISSUE_TEMPLATE/`.
  `.github/CODEOWNERS` marks schema, parsing and storage as owner-reviewed.
- Read `CLAUDE.md` first: it is the list of decisions that are not up for
  re-litigation. `AGENTS.md` is a symlink to it.
- Prefer the platform and existing helpers over new dependencies. Every
  dependency in `package.json` is there for a reason listed in §2.
- Deliberate shortcuts with a known ceiling carry a `ponytail:` comment
  naming the ceiling and the upgrade path. Grep for them before planning
  performance or multi-device work.
- Strings shown to users make privacy claims (§1). If a change would make
  any of them untrue, change the copy in the same PR. The policy itself is
  linked from Login and Profile > About via `PRIVACY_POLICY_URL` (`src/links.ts`).

---

## 9. Known gaps and where to go next

- Phone OTP needs an SMS provider (Twilio or similar) enabled in Supabase;
  then set `PHONE_SIGN_IN_ENABLED` in `LoginScreen.tsx` to show it again.
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
- Transactions inbox follow-ups: advanced accounting filters (by type,
  account, date range) for Reports; align Home's Net card (cash flow) with
  the P&L; `replaceLocal` in `rulesSync.ts` clears manual overrides on a sync
  pull, which un-finalizes transactions (upgrade: `PRAGMA defer_foreign_keys =
  ON`, clear only overrides whose category no longer exists).
