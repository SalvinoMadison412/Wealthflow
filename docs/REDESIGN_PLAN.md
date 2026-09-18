# WealthFlow redesign — execution handoff

Planned by Fable 5.1, refined across two passes: a critical review + build
plan, then this literal execution checklist. Read this top to bottom before
starting any PR below. Each PR is its own branch, its own PR against `main`,
per [CLAUDE.md](../CLAUDE.md).

Rules that apply to every step (from CLAUDE.md; re-read before each PR):
- One branch + one PR per step, against `main`. Never commit to `main`.
  Branch names: `feat/pr01-tokens`, `feat/pr02-sqlite`, etc.
- Expo managed workflow only. Every dependency must run in Expo Go. No
  ejecting, no custom dev client, no config plugins beyond those already in
  `app.json` (`expo-asset`, `expo-font`, `expo-splash-screen`).
- No AI/LLM anywhere. Categorization = merchant regex/contains + amount
  rules, first-match-wins, `Uncategorized` fallback.
- On-device only. Nothing leaves the device in PR 1–12.
- Tests: `npm test` (jest-expo) must pass before every PR. Add a Jest test
  only for pure logic, never for UI.

---

## 0. Session setup (do before touching anything)

Read in this order, fully:
1. `/Users/salvinomadison/Desktop/WealthFlow/CLAUDE.md`
2. `package.json`, `app.json`, `App.tsx`, `index.ts`
3. `src/theme/tokens.ts` (to be replaced), `src/navigation/RootNavigator.tsx`
4. `src/data/RulesContext.tsx`, `src/data/TransactionsContext.tsx`,
   `src/data/categorize.ts`, `src/data/categorize.test.ts`
5. `src/statement/types.ts`, `src/statement/registry.ts`,
   `src/statement/reconciliation.ts`, `src/statement/insights.ts`,
   `src/statement/merchantNames.ts` (skim `kotakParser.ts`,
   `genericParser.ts`)
6. `src/pdf/PdfExtractorProvider.tsx` and `src/pdf/types.ts` (do not modify
   the pdf layer in any PR below)
7. All five `src/screens/*.tsx`, then `src/components/PieChart.tsx`,
   `BarChart.tsx`, `PressableScale.tsx`, `AppHeader.tsx`
8. `design/mockups/*.html` (open each; these are the approved visuals)

Facts to hold: no persistence exists; transactions have no ID; rules have no
`enabled`/`position`; categorization currently runs inside render;
`PieChart`/`BarChart` are hand-rolled SVG/Views; `NewRuleFormScreen` is
presented as a native-stack `modal`. Run `npm install && npm test` and
confirm green before starting PR 1.

---

## 1. PR 1 — Design tokens + fonts

**Scope.** Rewrite `src/theme/tokens.ts`. Add six files to
`assets/fonts/`, delete the seven existing ones. Edit `app.json`
(`expo-font` plugin entry), `App.tsx`. Create `src/components/Amount.tsx`.
Delete `src/components/CornerBrackets.tsx`, `YinYang.tsx`,
`YinYangSpinner.tsx`, `MotionIntro.tsx`. Edit every file that imports the
deleted components or removed tokens so the app compiles (old layouts stay;
only make them compile with new token names).

**Instructions.**
- Download static TTFs from Google Fonts: `Inter-Regular.ttf`,
  `Inter-Medium.ttf`, `Inter-SemiBold.ttf`, `Manrope-SemiBold.ttf`,
  `Manrope-Bold.ttf`, `Manrope-ExtraBold.ttf`. No variable fonts, no other
  weights.
- Register them in the `expo-font` config plugin `fonts` array in
  `app.json`. Remove `useFonts` and the `fontsLoaded` gate from `App.tsx`;
  remove `fontAssets` export. Remove `showIntro`/`MotionIntro`. Keep
  `SplashScreen.preventAutoHideAsync` + hide on first layout.
- Set `StatusBar style="dark"`.
- `Amount` component: props `value: number`,
  `kind: 'income' | 'expense' | 'neutral'`, `size: 'sm' | 'md' | 'lg'`.
  Formats with `Intl.NumberFormat('en-IN', {style:'currency',
  currency:'INR', maximumFractionDigits: 2})`; prefixes `+` for income and
  `−` (U+2212) for expense; sets `fontVariant: ['tabular-nums']`; uses the
  *text* color variants below; sets `maxFontSizeMultiplier={1.3}`.
- Add a temporary `TabularCheck` screen (two right-aligned rows `1,111.11`
  / `8,888.88` in `Amount`) reachable from Profile; delete it before
  merging.

**Decisions pinned (put these exact values in tokens).**
- Colors: `background #FAFAF8`, `card #FFFFFF`, `textPrimary #14161A`,
  `textSecondary #6B7280`, `border #E7E8EC`, `accent #4C5FD5`,
  `accentText #FFFFFF`, `incomeFill #1FAA6D`, `incomeText #15803D`,
  `expenseFill #E5484D`, `expenseText #C0393E`, `warningFill #F5A623`,
  `warningText #92600B`, `track #EEF0F4` (progress bar background).
- Pill palette, index 0–9, each `{bg, text}`: 0 indigo `#E8EBFA/#3A4BB3`,
  1 green `#E1F5EB/#15803D`, 2 coral `#FCE4E5/#B3363B`, 3 amber
  `#FDF0D5/#92600B`, 4 teal `#DDF4F2/#0F766E`, 5 purple `#EFE6FA/#6D28D9`,
  6 pink `#FCE7F3/#BE185D`, 7 sky `#E0F2FE/#0369A1`, 8 olive
  `#ECF5D8/#4D7C0F`, 9 slate `#EDEFF3/#475569`. `Uncategorized` always uses
  9; `Transfer` always uses 7.
- Type scale (`fontFamily` names = file basenames): `display`
  Manrope-ExtraBold 32/40; `h1` Manrope-Bold 24/32; `h2` Manrope-Bold
  18/26; `h3` Manrope-SemiBold 16/22; `body` Inter-Regular 15/22;
  `bodyMedium` Inter-Medium 15/22; `label` Inter-Medium 13/18; `caption`
  Inter-Regular 12/16; `amountSm` Inter-SemiBold 15/22; `amountMd`
  Inter-SemiBold 20/26; `amountLg` Inter-SemiBold 28/34.
- Spacing scale: `4, 8, 12, 16, 20, 24, 32`. Page gutter 16. Content max
  width 600 (apply on tablet in PR 12).
- Radii: `button 12`, `card 16`, `sheet 20`, `pill 999`. Card shadow:
  `shadowColor #14161A, opacity 0.06, radius 12, offset {0,4}, elevation 2`.
- Never use `incomeFill`/`expenseFill`/`warningFill` as a text color
  anywhere. Never encode income/expense by color alone — `Amount` always
  prints the sign.

**Acceptance.** App boots on device 2 (Pixel 8 profile, latest API) and
device 1 (360×640, API 28) with no font-loading flash and the new fonts
visibly applied. `TabularCheck` decimal points align on both; if they do
not, set `fontVariant` anyway and note in the PR that alignment relies on
right-aligned fixed-width columns. `npm test` green. `grep -r "#" src/screens
src/components` shows no hex literals outside `tokens.ts`.

---

## 2. PR 2 — SQLite persistence

**Scope.** `npm install expo-sqlite@~57` (the only new runtime dependency
in PR 1–12). Create `src/db/schema.ts`, `src/db/db.ts`,
`src/db/useQuery.ts`, `src/db/transactions.ts` (write helpers),
`src/db/recategorize.ts`, `src/db/recategorize.test.ts`,
`src/db/transactionId.test.ts`. Rewrite `src/data/RulesContext.tsx` and
`src/data/TransactionsContext.tsx` as thin wrappers. Edit
`src/data/categorize.ts` (regex cache, override precedence),
`src/statement/insights.ts` (read materialized `category_id` instead of
recomputing), `App.tsx` (open DB before providers).

**Instructions.**
- Open one database `wealthflow.db` with `openDatabaseSync`. Migrations
  keyed on `PRAGMA user_version`; version 1 creates all tables below.
  Enable `PRAGMA foreign_keys = ON`.
- Tables: `accounts(id TEXT PK, bank, masked_number, owner_label,
  created_at)`; `statements(id TEXT PK, account_id FK, period_start,
  period_end, opening REAL, closing REAL, reconciled_ok INTEGER,
  imported_at)`; `transactions(id TEXT PK, statement_id FK, account_id FK,
  date, description, merchant, ref_no, withdrawal REAL NULL, deposit REAL
  NULL, balance REAL, category_id FK, matched_rule_id NULL,
  category_override_id NULL, is_transfer INTEGER DEFAULT 0)`;
  `categories(id TEXT PK, name UNIQUE, color_index INTEGER, bucket TEXT
  CHECK IN ('needs','wants','savings'), monthly_budget REAL NULL, position
  INTEGER)`; `rules(id TEXT PK, merchant_pattern TEXT NULL, amount_json
  TEXT NULL, category_id FK, enabled INTEGER DEFAULT 1, position INTEGER,
  created_at)`; `settings(key TEXT PK, value TEXT)`.
- Seed exactly two categories at migration: `uncategorized` (name
  `Uncategorized`, color 9, bucket `wants`) and `transfer` (name
  `Transfer`, color 7, bucket `needs`). No other seeded categories or
  rules (CLAUDE.md: rules are entirely user-built).
- Import path: `loadFromPages(pages, accountId)` parses, reconciles, then
  inside one `withTransactionSync` inserts the statement and `INSERT OR
  IGNORE` each transaction, then runs recategorize for that statement.
- `recategorize(scope)` where scope is `'all' | {statementId}`: load
  enabled rules ordered by `position ASC`, compile each `merchant_pattern`
  to a `RegExp` once (falling back to a lowercase `includes` matcher on
  invalid regex, as today), and update `category_id` + `matched_rule_id`
  per row. Precedence: `category_override_id` if set → first matching
  enabled rule → `uncategorized`. Call it after every rule/category write.
- `useQuery(sqlFn, deps)`: runs the sync query, re-runs when `deps` change
  or when `addDatabaseChangeListener` fires for `wealthflow.db`. Contexts
  expose the write helpers and nothing derived.
- `insights.ts`: every breakdown becomes a SQL `GROUP BY` (category_id /
  merchant / strftime day-of-week) filtered by `is_transfer = 0`. Delete
  `spendByCategory(txs, rules)`-style signatures that take rules.

**Decisions pinned.**
- Transaction ID is **not a hash**. It is the pipe-joined string
  `accountId|date|withdrawal|deposit|balance|refNo|description` with
  numbers formatted to two decimals, `null` as empty string, description
  trimmed and whitespace-collapsed. Collision-free by construction,
  re-import dedupe via `INSERT OR IGNORE`.
- Account ID = `bank + '|' + masked_number` lowercased; if the parser
  cannot extract a masked number, use `bank|manual-<timestamp>` and let
  the user rename it in PR 4.
- Rule/category IDs: `Date.now().toString(36) +
  Math.random().toString(36).slice(2, 8)`. Do not add a UUID dependency.
- New rules get `position = (MIN(position) - 1)` i.e. insert at top
  priority.

**Acceptance.** Tests: same statement imported twice yields the same row
count; override beats a matching rule; disabled rule never matches; rule
position order respected; invalid regex falls back to contains. Import a
real Kotak PDF on device 2, kill the app, relaunch — Home still shows the
data. Recategorize-all over the synthetic fixture duplicated to ~3,000
rows completes under 200 ms (log the timing once, remove the log).

---

## 3. PR 3 — Navigation shell

**Scope.** Edit `src/navigation/RootNavigator.tsx`. Create placeholder
`src/screens/TransactionsScreen.tsx`, `BudgetScreen.tsx`,
`ImportScreen.tsx`. Delete `src/screens/InsightsScreen.tsx`. Edit
`src/components/AppHeader.tsx` to the new style.

**Instructions.**
- Tabs in order: `Home`, `Transactions`, `Budget`, `Rules`, `Profile`.
  Feather icons: `home`, `list`, `pie-chart`, `sliders`, `user`. Tab bar:
  `card` background, `border` top hairline, active tint `accent`, inactive
  `textSecondary`, label style `caption`, `maxFontSizeMultiplier 1.3` on
  labels. Remove the fade `sceneStyleInterpolator` and spring
  `transitionSpec`.
- Root stack: `MainTabs`, `Import` (`presentation: 'modal'`),
  `NewRuleForm` (`presentation: 'modal'`). Do not add a Household or
  Insights destination.
- Move the PDF pick/extract/password logic from `HomeScreen.tsx` into
  `ImportScreen.tsx` unchanged (do not touch `src/pdf/`). Home gets a
  temporary "Import statement" button that navigates to `Import`.
- In the PR description list which Insights features are dropped
  (day-of-week, weekend share) and that category/merchant breakdowns move
  to Budget/Home.

**Decisions pinned.** Do not build a sixth tab under any circumstances;
household scope in PR 11 is a header control. Keep
`predictiveBackGestureEnabled: false` in `app.json` for now.

**Acceptance.** All five tabs open on devices 1 and 2; at 200% font scale
tab labels do not overflow into two lines or clip; the tab bar sits above
the Android gesture bar (safe-area inset applied). Import modal opens and
closes with hardware back.

---

## 4. PR 4 — Import Statement screen

**Scope.** `src/screens/ImportScreen.tsx`, `src/db/transactions.ts`
(account create/rename), `src/statement/registry.ts` / `kotakParser.ts`
only if needed to surface bank name + masked account number in
`ParsedStatement` (add optional fields to `src/statement/types.ts`; do not
change parsing logic).

**Instructions.**
- Layout: dropzone card at top (icon, "Choose a PDF statement",
  supported-banks caption), then "Accounts" list with one card per
  account: bank, masked number, owner label, last imported period, an
  "Import" button per account. Empty state when no accounts: single
  dropzone only.
- First import with no matching account creates one; show an inline
  "Which account is this?" chooser only if masked number extraction
  fails.
- Keep the password prompt flow exactly as it works today.
- After import show a result card: transactions count, period, and a
  reconciliation badge: `incomeFill` tint "Balanced" or `warningFill` tint
  "Off by ₹X" (using `warningText`). Reconciliation is the correctness
  check (CLAUDE.md); never hide a failed one.
- Owner label field on the account card (free text, default "Me"). This
  is the seed for PR 11.

**Decisions pinned.** Account cards are tappable to rename owner label /
bank name only. No account deletion in this PR (add in PR 10 Profile).

**Acceptance.** Two different statements for two accounts import into two
account cards on device 2; a second import of the same file changes
nothing (row count stable). Failed-reconciliation badge renders at 200%
font scale without clipping.

---

## 5. PR 5 — Transactions list

**Scope.** `src/screens/TransactionsScreen.tsx`, create
`src/components/TransactionRow.tsx`, `src/components/CategoryPill.tsx`,
`src/components/FilterChip.tsx`, `src/db/queries.ts` (transaction list
query with filters).

**Instructions.**
- Use RN `SectionList`, sections keyed by ISO date,
  `stickySectionHeadersEnabled`, section header shows a long date and the
  day's net via `Amount kind='neutral' size='sm'`.
- `TransactionRow` is `React.memo`, receives primitives only (`id,
  merchant, categoryName, colorIndex, amount, kind, isTransfer`) and an
  `onPress(id)` that is stable (`useCallback` at screen level, no per-row
  closures). Row height ≥ 56 dp; minimum touch target 48.
- Filter chip row (horizontal scroll): Account (All + each), Month (last
  12 with data), Category (All + each + "Uncategorized"), plus a single
  "Uncategorized only" chip. Chips are `Pressable`,
  `accessibilityRole="button"`, `accessibilityState={{selected}}`.
- `CategoryPill`: uses the pill palette pair by `color_index`, `label`
  type, height 24, horizontal padding 10.
- Empty states: no statements (CTA to Import); filters matched nothing.
- Query is SQL with `WHERE` clauses; do not filter in JS.

**Decisions pinned.** No search box in this PR. Transfers show with the
sky `Transfer` pill and `kind='neutral'`.

**Acceptance.** On the low-end profile (device 5) with ~3,000 rows, Perf
Monitor JS thread stays ≥ 55 fps while flinging. Rows render with `Amount`
decimals aligned. Every chip ≥ 48 dp tall (use `hitSlop`). TalkBack reads
"merchant, category, minus five hundred rupees".

---

## 6. PR 6 — Categorize sheet + inline rule creation

**Scope.** Create `src/screens/CategorizeSheet.tsx`,
`src/data/rulePattern.ts` + `rulePattern.test.ts`. Edit
`RootNavigator.tsx` (new root-stack screen), `TransactionRow` onPress
wiring, `src/db/transactions.ts` (override write, rule write with
position 0, retro count query).

**Instructions.**
- Register `CategorizeSheet` in the root stack with `presentation:
  'formSheet'`, `sheetAllowedDetents: [0.55, 1]`, `sheetGrabberVisible:
  true`, `sheetCornerRadius: 20`. Route param: `transactionId`.
- Sheet content top to bottom: merchant (h2) + description (caption), date
  · account, `Amount size='lg'`, current category pill with "Matched by
  rule: <plain-language rule>" or "Manually set" or "No rule matched",
  then a category grid (pills, all categories + "New category…" inline
  text field), then, once a different category is picked, the inline
  prompt card: "Auto-categorize future transactions like this?" with the
  generated matcher shown in an editable `TextInput`, the retro count line
  "Also recategorizes N past transactions", buttons "Create rule" (accent)
  and "Just this one" (secondary).
- "Just this one" → write `category_override_id`, recategorize that row,
  close. "Create rule" → insert rule at top priority with the edited
  matcher, clear override on this row, recategorize all, close.
- `rulePattern.ts`: `suggestPattern(merchant)`: uppercase-trim, strip
  trailing tokens that are all digits/`*`/`-`/`#`, keep the first 2 words
  max, then **regex-escape** the result (`[.*+?^${}()|[\]\\]`).
  `describeRule(rule)` returns the plain-language string used here and in
  PR 8.
- `retroCount(pattern, amount)` = SQL count of transactions that would
  match and are not overridden.

**Decisions pinned.**
- Fallback trigger: in the first commit of this PR, test the formSheet on
  device 1 (API 28) and device 2. Switch to `presentation:
  'transparentModal'` with a bottom-anchored card (`sheet` radius, dim
  backdrop `#14161A` at 40%, `KeyboardAvoidingView`) **if any of** these
  occur on either device: the sheet does not open, there is no dimmed
  backdrop, the keyboard covers the matcher `TextInput`, or hardware back
  does not dismiss the sheet. Do not spend more than one commit trying to
  fix formSheet on Android; take the fallback and note it in the PR.
- Hardware back dismisses the whole sheet, including the inline prompt.
- Sub-category is **out of scope**; do not add a field for it.

**Acceptance.** `rulePattern.test.ts` covers: `AMAZON.IN` escapes the dot,
`SWIGGY*ORDER-8812` → `SWIGGY`, invalid input never throws. Manual flow:
tap tx already matched by rule A, pick a new category, "Create rule" → new
rule sits above A in Rules and the tx shows the new category after
reopening the sheet. "Just this one" survives toggling rule A off and on.
Keyboard test on device 1 at 130% font scale.

---

## 7. PR 7 — Home dashboard

**Scope.** Rewrite `src/screens/HomeScreen.tsx`. Rewrite
`src/components/BarChart.tsx` as a two-series (income/expense) Views
chart. Add queries to `src/db/queries.ts`: monthly totals for last 6
months, recent 5 transactions.

**Instructions.**
- Sections: header with greeting + month name and a `+` import button (48
  dp); "Net this month" card (`amountLg`, kind by sign) with
  income/expense split row beneath (`Amount size='sm'`); 6-month bar chart
  card (paired bars per month, `incomeFill`/`expenseFill`, month labels
  `caption`, values printed on tap not permanently); "Recent" card with
  five `TransactionRow`s and a "See all" link to the Transactions tab.
- All totals exclude `is_transfer = 1`.
- Empty state when no statements: illustration-free card with heading,
  one sentence, and an "Import statement" button.
- Memoize chart input on `(dataVersion, month)`; the chart receives a
  12-number array, never transactions.

**Decisions pinned.** Bar chart is plain Views, no SVG, no animation. Bars
≤ 12 total. No "insights" prose sentences on Home.

**Acceptance.** Home renders at 360 dp width without horizontal scroll and
at 200% font scale without the net amount clipping (verify
`maxFontSizeMultiplier 1.3` on `Amount`). Perf: switching tabs back to
Home does not re-render the chart when nothing changed (check once with
React DevTools Profiler).

---

## 8. PR 8 — Rules screen

**Scope.** Rewrite `src/screens/RulesListScreen.tsx`; restyle
`src/screens/NewRuleFormScreen.tsx` with tokens; `src/db/transactions.ts`
(toggle, delete, reorder).

**Instructions.**
- Each rule is a card: `describeRule(rule)` as `bodyMedium`, target
  `CategoryPill`, RN `Switch` bound to `enabled` (thumb/track colors from
  tokens), overflow with "Move up", "Move down", "Delete". Priority note
  at top: "Rules are checked top to bottom; the first match wins."
- Toggle/reorder/delete each write then call recategorize-all after the
  interaction (use `InteractionManager.runAfterInteractions`).
- Delete shows a 5-second undo bar (plain View at bottom, above tab bar);
  actual delete happens after timeout.
- `NewRuleFormScreen`: same fields as today (merchant pattern, amount
  condition, category picker reusing PR 6 pill grid), new visual style,
  add at top priority.

**Decisions pinned.** No drag-and-drop; move up/down only. No rule naming
field. No sharing/export.

**Acceptance.** Toggling a rule off changes affected rows in Transactions
without app restart. Switch has `accessibilityLabel` = the rule
description. Cards readable at 200% font scale on device 1.

---

## 9. PR 9 — Budget Planner

**Scope.** Rewrite `src/screens/BudgetScreen.tsx`. Replace
`src/components/PieChart.tsx` with `src/components/Donut.tsx`. Create
`src/components/ProgressBar.tsx`, `src/data/budget.ts` + `budget.test.ts`,
queries for spend-by-category and spend-by-bucket for a month.

**Instructions.**
- Header: month picker (previous/next), preset selector chips: `50/30/20`,
  `60/20/20`, `Custom`. Custom shows three steppers that must sum to 100.
- Donut card: `react-native-svg` `Circle`s with
  `strokeDasharray`/`strokeDashoffset`, `strokeWidth 18`, `strokeLinecap
  round`, one circle per bucket in this order needs→wants→savings using
  pill colors 0, 5, 1; center shows "Planned vs actual" amounts. Below:
  three rows per bucket: planned ₹ (income × %), actual ₹, `ProgressBar`.
- Categories section: one row per category with spend > 0 or budget set:
  name pill, a bucket chip (needs/wants/savings, tap cycles), optional
  monthly budget field, `ProgressBar` of spent/budget. Bar color: `accent`
  under 80%, `warningFill` at 80–100%, `expenseFill` over 100%.
- `budget.ts`: pure functions `planned(income, pct)`,
  `bucketTotals(rowsByCategoryWithBucket)`, `progressState(spent,
  budget)`; all deterministic (CLAUDE.md: no model, ever).
- Income base = month's total deposits excluding transfers; if zero, read
  `settings.monthly_income`; if that is unset, render an empty state with
  a button to set it (writes the setting inline).

**Decisions pinned.** Presets change only the three percentages;
per-category budgets persist independently. Donut and bars are static (no
animation). Bucket default for new categories is `wants`.

**Acceptance.** `budget.test.ts`: percentages sum check, zero-income path,
>100% state. Donut has ≤ 4 SVG elements. Screen usable at 360 dp with
progress bar labels not truncated at 130% font scale. `ProgressBar`
exposes `accessibilityValue`.

---

## 10. PR 10 — Profile + Smart Calculator

**Scope.** Rewrite `src/screens/ProfileScreen.tsx`; create
`src/components/SettingsRow.tsx`, `src/data/calculator.ts` +
`calculator.test.ts`; account delete + data wipe helpers in
`src/db/transactions.ts`.

**Instructions.**
- Settings list: Accounts (list with owner label edit and delete-with-
  confirm), Monthly income (fallback value), Categories (rename, color,
  delete-with-reassign-to-Uncategorized), Data (wipe all local data with a
  typed-confirm `Alert`), About (version, "All processing happens on your
  device" line).
- Smart Calculator card: inputs monthly contribution, annual rate %, years
  → future value (monthly compounding); and goal amount → months to
  reach. Pure math in `calculator.ts`. Copy uses "estimate"; never the
  words "AI" or "predict".

**Decisions pinned.** No dark-mode toggle (light only in v1). No export in
this PR. No cloud/sync entry point of any kind.

**Acceptance.** `calculator.test.ts` checks a known compound-interest
value and the zero-rate case. Wipe leaves the app in the PR 3 empty state
without crashing on any tab. Every row ≥ 48 dp.

---

## 11. PR 11 — Household Phase 0 (on-device only)

**Scope.** Create `src/components/ScopeSwitch.tsx`,
`src/data/transfers.ts` + `transfers.test.ts`. Edit `HomeScreen`,
`TransactionsScreen`, `BudgetScreen` headers and their queries;
`src/db/transactions.ts` (run transfer detection after import);
`ProfileScreen` (household section = owner-label management only).

**Instructions.**
- `ScopeSwitch`: segmented control `Me | Household | <each distinct
  owner_label>`; selected value stored in `settings.scope`; "Me" =
  accounts with owner label `Me` or the single account when only one
  exists. Every Home/Transactions/Budget query takes the scope's account
  IDs as a filter.
- `detectTransfers(accountIds)`: for every pair of transactions on
  different accounts where `abs(withdrawal_A - deposit_B) < 0.005` and
  `|date_A - date_B| ≤ 2 days`, mark both `is_transfer = 1` and
  `category_id = 'transfer'`; each transaction can pair at most once
  (greedy by nearest date). Run after each import within the same DB
  transaction. Deterministic; no heuristics beyond amount+date.
- Profile › Household: text explaining "Everyone's statements on this
  phone. Nothing is shared or uploaded." plus the owner-label list.

**Decisions pinned.** No backend, no network permission use, no invite, no
roles. This is the complete family feature for v1 (CLAUDE.md: on-device
only).

**Acceptance.** `transfers.test.ts`: matched pair marked, unequal amounts
not marked, 3-day gap not marked, one tx cannot match twice. With two
accounts and a real transfer between them, Home "Net this month" excludes
it in `Household` scope and Transactions shows both legs with the
`Transfer` pill.

---

## 12. PR 12 — Polish and QA sweep

**Scope.** Any file; no new features. Add content max-width wrapper (600
dp, centered) in `AppHeader`/a shared `Screen` container.

**Instructions.** For each of the 8 screens (Home, Transactions,
CategorizeSheet, Import, Rules, NewRuleForm, Budget, Profile) run the
matrix and record results in the PR description as a table:
- Devices: 1 (360×640, API 28), 2 (412×915, latest API), 3 (393×851), 4
  (800×1280 tablet), 5 (low-end profile, lists/charts only).
- Font scale 100 / 130 / 200 on devices 1 and 2.
- TalkBack pass on device 2.
- Perf Monitor on device 5 for Transactions and Home.
- Screenshots of each screen at device 2 / 100% attached.

Fix everything that fails; forbid new hex literals, missing
`accessibilityLabel` on icon buttons, touch targets < 48 dp, safe-area
misses (top and bottom, including inside the sheet). Confirm cold start
splash→Home under 1.5 s on device 2 and that no `useFonts` gate remains.

**Acceptance.** Table fully green; `npm test` green; `grep -rn
"Insights\|CornerBrackets\|YinYang\|MotionIntro\|Doto\|SpaceGrotesk\|
IBMPlex\|Yuji" src App.tsx` returns nothing. Only then is the redesign
shipped.

---

## Post-v1 — Household Phase 1 (do NOT start without explicit go-ahead)

Four PRs, all behind an opt-in toggle in Profile › Household that defaults
off. CLAUDE.md compliance rule for this whole epic: Supabase stores only
ciphertext of derived monthly aggregates plus household/member IDs,
timestamps, and an invite-token hash. Raw transactions, merchants,
descriptions, and the household key never leave the device. Everything
below runs in Expo Go; no config plugins.

- **H1 — Crypto + key storage.** `npm install expo-secure-store
  expo-crypto @noble/ciphers`. Create `src/household/crypto.ts` + test:
  256-bit random household key via `expo-crypto` `getRandomValues`,
  AES-256-GCM via `@noble/ciphers` with a fresh 12-byte nonce per payload,
  key stored in `expo-secure-store` under `household_key`. Invite code
  format: `base64url(householdId) + '.' + base64url(inviteToken) + '.' +
  base64url(key)`. Test: encrypt/decrypt round trip, tampered ciphertext
  throws.
- **H2 — Backend.** `npm install @supabase/supabase-js`. New standalone
  Supabase project (never shared with any other project). Tables
  `households(id, invite_token_hash, created_by)`,
  `household_members(household_id, member_id, joined_at)`,
  `member_aggregates(household_id, member_id, period, ciphertext, nonce,
  updated_at, PK(household_id, member_id, period))`. Anonymous auth only;
  session storage adapter = `expo-sqlite/kv-store`. RLS: select where
  caller is a member of `household_id`; insert/update only where
  `member_id = auth.uid()`; join via an RPC that checks `sha256(token) =
  invite_token_hash`. Owner-only budget row lives in `member_aggregates`
  under the owner's `member_id` with period `'budget'`.
- **H3 — Aggregates sync.** `src/household/aggregate.ts` + test: per month
  → `{displayName, income, expense, byCategory: {name: amount},
  bucketPct}` excluding transfers, ≤ 2 KB. Push current + previous month
  after every import/rule/override write; pull on app foreground. No
  realtime, no offline queue beyond "retry on next foreground".
- **H4 — UI.** Profile › Household: create household (shows invite code +
  native `Share`), join (paste code), members list, leave. `ScopeSwitch`
  gains remote members; Home/Budget household mode sums decrypted member
  rows; Transactions has no remote mode (transactions are never shared).
  Explicitly unsupported and not to be built: roles/limited views, shared
  rules, shared transactions, joint-account dedupe, QR scanning.
