# WealthFlow feature audit

Audit of `main` after PR 1–12 of [REDESIGN_PLAN.md](REDESIGN_PLAN.md) shipped.
This is a capability audit, not a UI plan: what would make the app
exponentially more useful to someone tracking their money from bank
statement PDFs, given the rules in [CLAUDE.md](../CLAUDE.md).

Every suggestion below was checked against the non-negotiables before it
made the list: deterministic parsing and categorization, on-device by
default, Supabase (if ever) holds ciphertext or non-sensitive config only,
reconciliation stays the correctness check, Expo managed workflow, Android
first with iOS as a build target. Anything that brushes a constraint is
labelled **Requires user decision** and says exactly which constraint.

Complexity labels:

- **Quick win** — fits the existing schema/query/screen pattern; one PR.
- **Substantial** — a new subsystem or real design work; several PRs.
- **Requires user decision** — touches a pinned decision or a CLAUDE.md
  constraint; do not start without an explicit go-ahead.

Dependency note: PR 1–12 added exactly one runtime dependency
(`expo-sqlite`). Each item states its dependency cost; most are zero. The
few that need a package say so and name the package.

---

## 0. What the app is today, and what the audit turned up

**Shape.** Five tabs (Home, Transactions, Budget, Rules, Profile) plus three
modals (Import, New Rule, Categorize sheet). One bank template (Kotak) and a
generic fallback that is the same row regex without Kotak's description
cleanup. SQLite tables: `accounts`, `statements`, `transactions`,
`categories`, `rules`, `settings`. Rules are merchant regex/contains + amount
condition, first-match-wins by `position`, override beats rule, transfers
detected by amount+date across accounts. Household Phase 0 = owner labels on
accounts and a scope switch.

**Things found while reading that are already wrong or dead, independent of
any new feature.** These are cheap and should go first; a few of them
undercut the "reconciliation is the correctness check" rule today.

| # | Finding | Where | Why it matters |
|---|---------|-------|----------------|
| A | `statements.reconciled_ok` is written on import and **never read anywhere**. Once the Import result card is dismissed, a failed reconciliation is invisible forever. | `src/db/transactions.ts:94`, no reader in `src/db/queries.ts` | CLAUDE.md: "never hide a failed one." The app currently does, one tap after showing it. |
| B | Rules match against `transactions.merchant` (the cleaned payee), but every label says "Description contains". | `src/db/recategorize.ts:48` matches `tx.merchant`; `CategorizeSheet.tsx:160` and `rulePattern.ts:49` say "description" | A user who writes a rule for text that only appears in the raw narration (`Pay to BharatPe`, `SIP Payment`) gets zero matches and no explanation. Either match `description` too, or relabel. Matching `merchant OR description` is one line in `matching.ts` and strictly more useful. |
| C | Budget preset (`60/20/20` / custom percentages) lives in `useState` and resets on every app launch. | `BudgetScreen.tsx:57-58` | The user's budget plan does not persist. Store under `settings.budget_preset`. |
| D | `Transaction.raw` (the reconstructed statement line) is produced by the parser and **dropped** before insert. | `src/statement/types.ts:11`, no column in `schema.ts` | Without it there is no way to show the user "here is the line we read" when a parse looks wrong. Needed by §1.2 and §1.3. |
| E | Home's `MONTH_NAME` is computed once at module load. | `HomeScreen.tsx:47` | An app left open across midnight on the 31st shows the old month over the new month's numbers. |
| F | Deleting an account leaves the counterpart leg of any transfer pair marked `is_transfer = 1` with no partner; the detector only scans `is_transfer = 0` so it never heals. | `transactions.ts:338`, `:158` | That leg is now silently excluded from every total, with no way to see or undo it. |
| G | `listMonthsWithData` is capped at 12; older statements exist in the DB but cannot be filtered to. | `queries.ts:120` | Anyone with more than a year of history loses access to it in the UI. |
| H | No way to un-mark a false transfer pair or hand-mark a missed one. | no writer for `is_transfer` besides the detector | Two ₹1,000 movements on the same day across two family accounts is a plausible false positive; both then vanish from spend. |
| I | `formatRupees` is re-implemented inline in `BudgetScreen` and `ProfileScreen` despite `Amount` being "the one place amounts are formatted". | `BudgetScreen.tsx:46`, `ProfileScreen.tsx:17` | Convention drift; also loses the tabular-nums alignment. |

Recommendation: one "audit fixes" PR for A–I before anything below. All
quick, all zero dependencies, and A/D/F/H are prerequisites for the trust
work in §1.

---

## 1. Trust and correctness

The app's whole pitch is "deterministic, and we prove it with
reconciliation." Today the proof is a single number shown once. This
section makes the proof durable, granular, and actionable.

### 1.1 Statement ledger with reconciliation status per statement
Per account, list every imported statement (period, row count, opening,
closing, reconciled badge, imported-at) on the Import screen's account card
and in Profile › Accounts. Tapping a failed one shows the delta and the
row-level break from §1.2. Includes "delete this statement" (cascade its
transactions, re-run transfer detection), which does not exist today — the
only way to undo a bad import is to delete the whole account.

- **Why:** Finding A. A failed reconciliation is the one signal the user has
  that a number on Home is wrong; it must be reachable after the fact.
- **Complexity:** Quick win. One query over `statements`, one list, one
  cascade delete mirroring `deleteAccount`.
- **Deps:** none.

### 1.2 Row-level balance continuity check ("where did it break?")
Reconciliation today is aggregate: opening + credits − debits vs closing.
Add the row-level invariant the data already supports: for each parsed row,
`previousBalance − withdrawal + deposit` must equal `balance` (±0.01). The
first row that violates it is where parsing went wrong (a dropped wrapped
line, a mis-split amount, a row the regex skipped). Store the offending row
index on the statement; surface "Off by ₹350 — first mismatch at row 41 (09
Mar, UPI/RAVI KUMAR…)" and let the user open that transaction.

- **Why:** "Off by ₹X" tells the user something is wrong; this tells them
  *what*. It also catches the case where two errors cancel and the aggregate
  check passes anyway. It strengthens reconciliation, does not replace it.
- **Complexity:** Quick win. Pure function next to `reconcile()` with a
  test on the synthetic fixture; two columns on `statements`
  (`first_mismatch_row`, `unparsed_lines`, see 1.3).
- **Deps:** none.

### 1.3 Unparsed-line report
`parseKotak`/`parseGeneric` silently drop any line that does not match
`ROW_REGEX`. Count lines that *start like a row* (leading index + date) but
failed the full match, keep the first few as samples, and show "3 lines
looked like transactions but could not be read" on the result card and in
the statement ledger, with the raw text.

- **Why:** This is the actual root cause of most reconciliation failures on
  real statements (wrapped narrations, footnotes inside the table). Showing
  the lines makes the failure debuggable by the user and reportable to you,
  and it is the fastest way to discover what a new bank template needs.
- **Complexity:** Quick win. Requires persisting `raw` (Finding D).
- **Deps:** none.

### 1.4 Cross-statement continuity and gap detection
For each account, order statements by period; statement N's closing should
equal statement N+1's opening. If not, either a statement is missing
("Nothing imported between 31 Mar and 1 Jun") or one of them misparsed.
Show a gap chip on the account card and a banner on Home when the current
scope has a gap in the last 6 months (the bar chart is lying by omission in
that case).

- **Why:** Multi-month charts and budgets are only as good as the coverage.
  Today a missing month renders as a ₹0 month, which looks like frugality.
- **Complexity:** Quick win. One query, one pure function, one banner.
- **Deps:** none.

### 1.5 "Show source line" in the Categorize sheet
A collapsed "Statement line" row under the description that expands to the
persisted `raw` text and the running balance.

- **Why:** When a merchant name looks odd or an amount surprises the user,
  the fastest way to restore trust is showing the exact text the app read.
  It also makes rule writing easier (the user sees what text is available
  to match — see Finding B).
- **Complexity:** Quick win once D is done.
- **Deps:** none.

### 1.6 Clear failure for image-only PDFs
When pdf.js returns zero text items across all pages, say so: "This PDF has
no text layer (it is a scanned image). WealthFlow does not OCR statements;
download the text version from your bank's site." Today it surfaces as an
unhelpful zero-transaction import.

- **Why:** Scanned statements are common for older archives. OCR is an ML
  model in the parsing path, so it stays out (CLAUDE.md); the app should
  say that plainly instead of failing quietly.
- **Complexity:** Quick win. One check in `importStatement` or the bridge.
- **Deps:** none.

---

## 2. Getting more statements in (multi-bank, multi-account robustness)

The registry supports one bank. The "generic" fallback is the Kotak row
shape without Kotak's cleanup, so in practice the app works for Kotak
customers. This is the biggest ceiling on who can use it at all.

### 2.1 Column-aware row parsing (the enabler for every other bank)
`groupIntoLines` throws away the x-coordinates pdf.js gives us and parses a
joined string with a regex that requires "index date description amount
balance". Replace the *row assembly* step (not the pipeline) with a
column-aware one: detect the header line ("Date", "Narration/Description",
"Withdrawal/Debit", "Deposit/Credit", "Balance") and record each column's
x-range; then for every subsequent line, bucket each text item into the
column whose x-range contains it. Consequences: withdrawal vs deposit is
read from its column rather than inferred from balance direction; a line
with description-column text and no amount-column text is a wrapped
narration and is appended to the previous row; a row with both Dr and Cr
present (some banks print 0.00 in the empty column) parses correctly. Keep
`inferAmounts` as the fallback when no header is found, and keep
reconciliation as the check — column parsing that fails to reconcile is
rejected the same way regex parsing is.

- **Why:** HDFC, SBI, ICICI and Axis statements all break the current regex
  for at least one of these reasons (dd/mm/yy dates, wrapped narrations, no
  row index, both amount columns printed). Column parsing is deterministic,
  uses data already extracted, and turns "add a bank" into "add a header
  vocabulary + a date format + a description cleaner" instead of a new
  regex per bank.
- **Complexity:** Substantial. New `src/statement/columns.ts` with tests
  built from synthetic `TextItem` fixtures (same technique as
  `syntheticKotakStatement.ts`); `kotakParser` migrates onto it as the
  proof, then §2.2.
- **Deps:** none.

### 2.2 Second and third bank templates (HDFC, then SBI or ICICI)
Once 2.1 exists, each template is: `canParse` (header vocabulary / bank
name in header text), a date format, and a description → merchant/refNo
cleaner in the style of `classifyDescription`. Also extract the bank name
and masked account number from the header (currently never attempted —
`ParsedStatement.bank` is set by the registry, `maskedNumber` is typed by
the user), which lets the account chooser pre-select the right account.

- **Why:** Market coverage. Also lets `makeAccountId(bank, maskedNumber)`
  actually be used, so re-importing into the wrong account becomes hard.
- **Complexity:** Substantial per bank at first, quick after the second one.
  Needs a real (gitignored) sample statement per bank to build the synthetic
  fixture from.
- **Deps:** none.

### 2.3 Credit card statements as a first-class account kind
Credit card statements have no running balance; their reconciliation is
`previous balance + purchases + fees − payments = total due`. Support them
with `accounts.kind IN ('bank','card')`, a card-specific `reconcile`, and
sign conventions where a purchase is an expense and a payment received is a
transfer (it pairs with the debit from the bank account via the existing
detector).

- **Why:** For most urban Indian users the majority of discretionary spend
  is on a card. Today that spend shows up in WealthFlow only as one large
  monthly "expense" (the bill payment) from the savings account, which
  destroys category accuracy and makes "Wants" look like a single line
  item. Until this exists, users need §2.4 as a stopgap.
- **Complexity:** Substantial + **Requires user decision** (schema change
  to `accounts`, a second reconciliation formula — still opening/closing
  arithmetic, still deterministic, but the user should approve the
  extension of the correctness rule to cards).
- **Deps:** none.

### 2.4 Manual transfer / exclude toggle (stopgap for 2.3 and fix for H)
In the Categorize sheet: "This is a transfer between my accounts" (sets
`is_transfer = 1`, category Transfer, `matched_rule_id NULL`, marks a manual
flag so the detector and future recategorize leave it alone) and its
inverse for a false pair. Consider a "Credit card payment" convenience that
is the same thing with a clearer label.

- **Why:** Finding H, plus every user with an un-imported destination
  account (card, spouse's bank, brokerage) needs this today.
- **Complexity:** Quick win. One column `transfer_manual INTEGER DEFAULT 0`
  and a WHERE clause in `runTransferDetection`.
- **Deps:** none.

### 2.5 Open a PDF *with* WealthFlow (share-sheet / intent import)
Register the app as a handler for `application/pdf` so "Open with →
WealthFlow" appears from Gmail, the bank's app, or Files. On Android that
is an `intentFilters` entry in `app.json`; on iOS a `CFBundleDocumentTypes`
entry under `ios.infoPlist`. On launch, read the incoming URI with the same
`fetch → blob → base64` path `ImportScreen` already uses and open the Import
modal with the file preloaded.

- **Why:** The monthly friction is: find the email, download, open the app,
  tap Import, find the file. This removes four of the five steps, on both
  platforms, with config only. It is the single biggest retention lever
  for a manual-import app.
- **Complexity:** Quick win (config + `Linking.getInitialURL` /
  `addEventListener('url')` in `App.tsx` + a route param). Verify on Expo
  Go vs a build; intent filters only take effect in a built binary.
- **Deps:** none (`Linking` is RN core).

### 2.6 Remember the statement password per account
Bank PDFs are usually protected with a fixed pattern (PAN/DOB). Offer
"Remember for this account" on the password prompt.

- **Why:** Typing the same password every month is the second-biggest
  friction after finding the file.
- **Complexity:** Quick win in code, but **Requires user decision**: the
  right store is `expo-secure-store` (Keychain / Keystore), a new dependency
  and the first piece of secret material the app persists. Storing it in
  `settings` is not acceptable.
- **Deps:** `expo-secure-store` (managed-workflow, Expo Go compatible; also
  already planned for Household H1).

### 2.7 CSV import as a parallel input
Most Indian banks export a CSV/XLS of the same table. A CSV importer that
maps columns by header name reuses the entire downstream pipeline
(`Transaction[]` → reconcile → insert → recategorize). Reconciliation still
runs when a balance column exists; imports without one are refused.

- **Why:** Sidesteps PDF layout fragility entirely for the banks whose PDFs
  are hardest, and is trivially deterministic.
- **Complexity:** Substantial-lite (a CSV splitter that handles quoted
  commas, a header mapper, a picker filter). **Requires user decision**:
  CLAUDE.md is written around PDFs; this widens the product's definition
  slightly. XLS is out unless a dependency is accepted; CSV only.
- **Deps:** none for CSV.

---

## 3. Making categorization stick (the rules engine)

Rules are the product. The redesign made creating one rule pleasant; it did
not make going from 400 uncategorized rows to zero pleasant. That workflow
is where users churn.

### 3.1 "Sort uncategorized" triage screen
A screen (reachable from a persistent Home card "37 uncategorized
transactions" and from the Transactions "Uncategorized only" chip) that
groups uncategorized transactions by `merchant`, sorted by count then total:
`Swiggy — 14 transactions, ₹6,240`. Tapping a group opens the same category
grid + matcher prompt as the Categorize sheet, prefilled with
`suggestPattern(merchant)` and the group's count as the retro count; "Create
rule" categorizes the whole group and the list shrinks. A "skip" moves to
the next group.

- **Why:** This is the flywheel of a rule-based system. Ten taps should
  categorize 80% of a statement, because merchants follow a power law. Today
  it takes one sheet per transaction, and there is no indicator anywhere of
  how much is left to sort.
- **Complexity:** Quick win bordering on substantial: one `GROUP BY merchant`
  query filtered to `category_id = 'uncategorized'`, one screen reusing
  `CategoryPill` and the prompt card, no new data model.
- **Deps:** none.

### 3.2 Edit an existing rule
There is no rule editing; the only recourse is delete + recreate, which also
loses position. Route `NewRuleForm` with `{ ruleId }` to prefill and update
in place.

- **Why:** Tightening a pattern that over-matched (`AMAZON` catching
  `AMAZON PAY` transfers) is the most common rule maintenance task.
- **Complexity:** Quick win.
- **Deps:** none.

### 3.3 Direction and account conditions
Add `direction: 'debit' | 'credit' | 'any'` and optional `accountId` to the
rule's stored JSON, the form, `matching.ts`, and `describeRule`. Keep
first-match-wins and the Uncategorized fallback exactly as is.

- **Why:** "Deposits over ₹20,000 → Salary" currently also fires on a
  ₹25,000 withdrawal. "Anything on the joint account → Household" is
  impossible. Both are amount/merchant-style deterministic conditions
  squarely inside the CLAUDE.md model.
- **Complexity:** Quick win. `amount_json` already stores arbitrary JSON;
  add fields, bump nothing.
- **Deps:** none.

### 3.4 Rule health: match counts and shadowing
Show "matched N transactions" on each rule card (`GROUP BY matched_rule_id`)
and flag rules with zero matches that sit *below* a broader rule as
"shadowed by rule above". Offer "Test rule" in `NewRuleForm` using the
existing `retroCount` (the Categorize sheet has it; the form does not).

- **Why:** With 40 rules, ordering bugs are invisible. This makes
  first-match-wins debuggable without reading the rule list like code.
- **Complexity:** Quick win.
- **Deps:** none.

### 3.5 Match on description as well as merchant (Finding B)
`matches(merchant, description, amount)`: merchant pattern tests against
`merchant` first, then `description`. Relabel copy to "Merchant or
description contains".

- **Why:** UPI narrations carry the useful signal in the note segment;
  Kotak's cleaner keeps the payee only.
- **Complexity:** Quick win; one extra column in the recategorize SELECT.
- **Deps:** none.

### 3.6 Merchant aliases (user-editable display names)
`merchantNames.ts` is an 11-entry hardcoded list. Add a `merchant_aliases
(pattern, display)` table the user fills from the Categorize sheet
("Rename merchant…"), applied at import and on demand. Display only; never
assigns a category.

- **Why:** `Ravi Kumar N` is the landlord; `THANDRA ADITYA` is a friend.
  Readable names make the Transactions list and §3.1 groups usable. It is
  also the deterministic answer to "the app should know what this merchant
  is" — the user teaches it once.
- **Complexity:** Quick win.
- **Deps:** none.

### 3.7 Importable starter rule packs
Ship no rules (as today), but allow importing a JSON rule pack (from §6.1's
format) — e.g. a community "Indian UPI merchants" pack — with a preview of
every rule before it is added, all at lowest priority so user rules win.

- **Why:** Cold start is brutal; a pack gets a new user to 60% coverage in
  one tap while keeping every rule visible, editable, and deterministic.
- **Complexity:** Quick win once §6.1 exists. **Requires user decision**:
  REDESIGN_PLAN pinned "no seeded rules"; an opt-in import the user
  reviews is arguably still user-defined, but it is your call, not mine.
- **Deps:** none.

### 3.8 Split a transaction across categories
Store child rows referencing a parent (`parent_id`, amount share); totals
sum children when present. Reconciliation is untouched because children sum
to the parent.

- **Why:** One Amazon order = groceries + a gift. Common request; without it
  the user either mis-categorizes or gives up on precision.
- **Complexity:** Substantial (touches every SUM query and the ID scheme).
  I would defer this; §3.1–3.6 deliver more per hour.
- **Deps:** none.

---

## 4. Deeper insight into spending

Everything here is arithmetic over rows already in SQLite. None of it
needs a model; all of it should be phrased as facts, not predictions.

### 4.1 Recurring payments and subscriptions
Detect series deterministically: same `merchant`, amounts within 10% (or
identical), 3+ occurrences, median gap 28–32 days (monthly) or 6–8 (weekly)
or 85–95 (quarterly). Show a "Recurring" card on Home: count, monthly total,
next expected date (last date + median gap — an arithmetic projection, worded
"usually around the 5th"), and highlight a series whose amount rose or that
skipped a cycle.

- **Why:** Subscriptions are where money leaks unnoticed, and statements are
  the only place they all appear together. This is the single most
  "wow" insight a statement app can offer without a model.
- **Complexity:** Substantial-lite: one pure function with a test, one query
  feeding it (merchant, date, amount for the last 12 months), one card.
- **Deps:** none.

### 4.2 Balance over time
Every transaction carries `balance`. Plot it per account for the selected
month (or 6 months) as a Views/SVG line, with min balance, and "salary day"
markers (largest credit per month). Add "lowest balance this month: ₹4,150
on 9 Mar" as a number on Home.

- **Why:** It is the most-asked question ("am I going to run out before
  payday?") and the data is already there, unused.
- **Complexity:** Quick win. `react-native-svg` is already a dependency
  (Donut); a polyline is ~30 lines.
- **Deps:** none.

### 4.3 Month-over-month and category comparison
On Budget and per-category: this month vs last month vs 3-month average,
with a small ▲/▼ and delta. On Home: "Expenses ₹42,300 · ▲ 12% vs Feb".

- **Why:** A number alone has no meaning; the same number next to last
  month's does. This is the cheapest insight uplift in the app.
- **Complexity:** Quick win (`getMonthlyTotals` already returns 6 months;
  a per-category version is one GROUP BY).
- **Deps:** none.

### 4.4 Top merchants and category breakdown on Home
REDESIGN_PLAN PR 3 said category/merchant breakdowns would move to
Budget/Home; they are on neither. Add a "Where it went" card: top 5
categories (bar, not donut) and top 5 merchants for the month, each row a
link into the filtered Transactions list.

- **Why:** The dashboard currently answers "how much" but not "on what".
- **Complexity:** Quick win.
- **Deps:** none.

### 4.5 Search, sort, date range
A search box on Transactions (`WHERE merchant LIKE ? OR description LIKE ?
OR CAST(withdrawal AS TEXT) LIKE ?`), sort by amount, and a "from–to" range
that also lifts the 12-month cap (Finding G). Show the sum of the filtered
result in the list header.

- **Why:** "What did I pay the electrician in June?" is unanswerable today.
  The filtered-total line turns the Transactions list into an ad hoc report
  tool for free.
- **Complexity:** Quick win.
- **Deps:** none.

### 4.6 Cash-flow calendar (heat map)
A month grid, each day tinted by net spend, tap → that day's list.

- **Why:** Weekend and salary-week patterns jump out visually; it replaces
  the day-of-week insight dropped in PR 3 with something more honest.
- **Complexity:** Quick win (Views grid; the data is the section list's
  per-day net).
- **Deps:** none.

---

## 5. Budget

### 5.1 Persist the plan (Finding C) and per-member income
Store preset/custom percentages in `settings`. Store `monthly_income`
per owner label (`monthly_income:<label>`) so Household scope sums the
fallbacks instead of using one person's.

- **Why:** The budget plan is the user's most deliberate input and it
  evaporates on restart; the household number is simply wrong with two
  earners today.
- **Complexity:** Quick win.
- **Deps:** none.

### 5.2 Safe-to-spend per day
`(planned wants − spent wants) / days remaining in month` as one large
number at the top of Budget (and optionally Home).

- **Why:** The single most actionable budget number; every other figure
  requires interpretation.
- **Complexity:** Quick win; pure function next to `progressState`.
- **Deps:** none.

### 5.3 Pay-cycle month boundary
A setting "my month starts on the <N>th" (salary date) used by every
`strftime('%Y-%m')` grouping via a small SQL expression (shift date by
N−1 days before bucketing).

- **Why:** Salary on the 28th vs 1st makes calendar months lie about income
  and about which month a spend belongs to.
- **Complexity:** Quick win in concept, medium in practice — every month
  query goes through one helper; do it once, test it once.
- **Deps:** none.

### 5.4 Budget history
Snapshot `categories.monthly_budget` into `category_budgets(category_id,
month, amount)` when edited, so changing this month's budget does not
rewrite last month's progress bars.

- **Why:** Retrospective honesty. Low urgency until users have several
  months of history.
- **Complexity:** Quick win.
- **Deps:** none.

---

## 6. Data ownership, safety, and quality of life

### 6.1 Export and import of rules + categories (JSON)
"Export rules" in Profile writes a JSON file (categories with color/bucket/
budget, rules in priority order with `describeRule` text alongside) and
opens the share sheet; "Import rules" picks a file, previews the diff, and
merges (by name for categories, appending rules below existing ones).

- **Why:** Rules are months of accumulated effort and today live only in
  one SQLite file on one phone. This is also exactly the "non-sensitive
  data" CLAUDE.md permits in Supabase — the file export is the zero-backend
  version and should exist before any sync does. Also unlocks §3.7 and a
  second household member bootstrapping from the first's rules.
- **Complexity:** Quick win.
- **Deps:** `expo-file-system` (present) + `expo-document-picker` (present)
  to write/read. Sharing a *file* on Android needs `expo-sharing` (one small
  managed-workflow package); RN core `Share.share({ message })` works with
  the JSON as text as a zero-dependency fallback.

### 6.2 Transaction export (CSV)
Per scope/month/all: CSV of date, account, merchant, description, debit,
credit, balance, category, transfer flag. Same share path as 6.1.

- **Why:** Users will want their data in a spreadsheet, their accountant
  will ask for it, and it is the honest form of "your data is yours".
  Explicitly user-initiated, so it does not conflict with "never uploaded
  by default".
- **Complexity:** Quick win.
- **Deps:** as 6.1.

### 6.3 Full local backup and restore
Copy `wealthflow.db` out via the share sheet and restore by picking a file
(validate `PRAGMA user_version` and table names before replacing). Optional
passphrase encryption of the backup file.

- **Why:** Phone loss = total loss today. Plain export covers the "I chose
  to put it in my Drive" case.
- **Complexity:** Plain copy: quick win. Encrypted: **Requires user
  decision** because it adds `expo-crypto` (+ a cipher such as
  `@noble/ciphers`, same stack REDESIGN_PLAN's H1 already scopes) — better
  to build it once as H1 and reuse it here than to add crypto twice.
- **Deps:** `expo-sharing`; encrypted variant as above.

### 6.4 App lock (biometric / device PIN)
Gate the app behind `LocalAuthentication.authenticateAsync()` on cold start
and after N minutes in background; blur the app-switcher snapshot.

- **Why:** It is a finance app holding a year of transactions in plaintext
  SQLite. Every comparable app has this; its absence will be the first
  review complaint.
- **Complexity:** Quick win in code; **Requires user decision** only because
  it is a new dependency.
- **Deps:** `expo-local-authentication` (managed workflow, Expo Go
  compatible, cross-platform).

### 6.5 Transaction notes and tags
`notes TEXT` and a simple `tags TEXT` (comma-joined) on transactions,
editable in the Categorize sheet, searchable via 4.5.

- **Why:** "Reimbursable", "for Mum", "warranty until 2027" — memory that
  the statement cannot carry. Tags also give a second axis without
  sub-categories (which the plan explicitly kept out).
- **Complexity:** Quick win.
- **Deps:** none.

### 6.6 Monthly import reminder
Local notification on a user-chosen day: "March's statement is usually out
by now."

- **Why:** The app is only as current as its last import.
- **Complexity:** Quick win in code; **Requires user decision** for the
  dependency. Skip if the intent-filter import (§2.5) lands first — the
  bank's own email becomes the reminder.
- **Deps:** `expo-notifications`.

### 6.7 Shareable monthly summary
"Share summary" produces a plain-text block (income, expenses, net, top 5
categories, uncategorized count) via RN `Share`. No image, no PDF.

- **Why:** Couples send each other this every month; text is enough and
  costs nothing. A PDF/image version would need `expo-print` or view
  capture — not worth a dependency.
- **Complexity:** Quick win.
- **Deps:** none.

### 6.8 Dark mode
Pinned out of v1 by the plan. Tokens are already centralised, so it is a
second palette and a `useColorScheme()` switch; noted for completeness, not
urgency.

- **Complexity:** Quick win mechanically, but a full QA sweep for contrast.
- **Deps:** none.

---

## 7. Family and household

Household Phase 0 (owner labels + scope switch, on-device) shipped. Phase 1
(encrypted aggregate sync via Supabase, four PRs H1–H4) is scoped in
REDESIGN_PLAN's gated section and is not repeated here. What follows is
what Phase 0 is still missing *on-device*, and what Phase 1 should be told
about before it starts.

### 7.1 Joint accounts
An account whose owner is two people. Simplest deterministic model: allow
`owner_label = 'Joint'` (or a multi-label `owner_labels` list) and include
Joint accounts in every personal scope, halved or whole per a setting
("count joint spending as: full / split evenly").

- **Why:** Most couples have one. Today it must be assigned to one person,
  which mis-states both people's numbers.
- **Complexity:** Quick win with the single 'Joint' label + include rule;
  medium with real multi-label.
- **Deps:** none.

### 7.2 Per-member budget and income (see 5.1)
Budget percentages and income fallback per owner label; Household view
sums them. Without this the Household budget donut is fiction.

### 7.3 Shared-expense settle-up (on-device)
Tag a transaction "shared" (with §6.5 tags or a dedicated flag) with a split
(50/50 default). A "Settle up" card in Household scope shows who paid how
much of the shared spend this month and the net owed, purely from local
rows. No sync required when both people's statements are on the same phone,
which is Phase 0's model.

- **Why:** It is the actual monthly conversation in a household, and it
  falls out of data the app already has.
- **Complexity:** Quick win with a flag + split percent column.
- **Deps:** none.

### 7.4 Notes for Household Phase 1 (do not start without go-ahead)
Two additions to the existing H1–H4 scope that this audit surfaces:
(a) the aggregate payload should carry the per-member *uncategorized* count
and reconciliation status so a partner can see "your side has 3 unreconciled
statements" — trust is a household property too; (b) §6.1's rules export
format should be the wire format if rules are ever shared (H4 currently
lists shared rules as explicitly unsupported; keep that, but design the
file format once).

---

## 8. Things that need your decision, and things I would say no to

### 8.1 Opt-in AI assistant over aggregates — Requires user decision
A chat/Q&A layer ("why was March expensive?") is the obvious ask. Facts:
it cannot run on-device in Expo managed workflow (no native inference
module), so it means sending data to a hosted model. If you ever want it,
the only shape compatible with CLAUDE.md's spirit is: strictly opt-in per
session; sends only derived monthly aggregates by category (never rows,
merchants, descriptions, or balances); read-only (it can answer, never
write a rule, category, or override); a visible "this leaves your device"
badge every time. It must never be wired to parsing or categorization, not
even as a "suggestion" — a suggested category is categorization by another
name and is out under CLAUDE.md. My recommendation: **do not build it.**
§4.1–4.4 answer the same questions deterministically and on-device, and
they are what makes the privacy pitch true rather than asterisked.

### 8.2 LLM-assisted rule suggestion — No
Same reasoning as above but firmer: it is on the categorization path by
definition. The deterministic equivalents are §3.1 (triage by merchant
frequency), §3.6 (aliases), and §3.7 (reviewable rule packs).

### 8.3 OCR for scanned statements — No
OCR is an ML model inside the parsing path. Detect and explain (§1.6)
instead.

### 8.4 Bank aggregator / account-linking APIs — No
The entire premise is "the statement PDF you already have, on your device."
Account Aggregator integrations move raw data through a third party and
would need credentials the app must never handle.

### 8.5 Cloud sync of transactions — Requires user decision, already scoped
Covered by Household Phase 1's constraint (ciphertext of aggregates only,
never rows). A personal multi-device sync of *rows* would have to be the
same client-encrypted design; if wanted, it should be an H5 after H1–H4,
not a separate system.

---

## 9. Prioritized shortlist — what I would build first

Assuming the §0 audit-fix PR (A–I) lands first as a prerequisite.

1. **§3.1 Sort-uncategorized triage screen** — it is the flywheel of a
   rule-based categorizer; ten taps should clear a statement, and today
   nothing even tells the user how much is left to sort.
2. **§1.1 + §1.2 + §1.3 Statement ledger with row-level break and unparsed
   lines** — makes "reconciliation is the correctness check" true after the
   result card closes, and pinpoints *which row* broke instead of a delta.
3. **§2.1 Column-aware parsing, then §2.2 HDFC** — the app is a Kotak app
   until this exists; column assembly is the deterministic foundation that
   makes each further bank a small template rather than a new regex.
4. **§3.2–3.5 Rules bundle (edit, direction/account conditions, match
   counts/shadowing, match on description) + §4.5 search** — a day or two of
   quick wins that turn the rules engine from "works" into "maintainable at
   40 rules", and fix the description-vs-merchant mismatch users will hit
   first.
5. **§6.1 + §6.2 Rules/categories JSON export-import and CSV transaction
   export** — the user's accumulated work and data should survive the phone;
   it is also the on-device precursor to any future Supabase rule sync and
   the format §3.7 rule packs need.

Next in line, in order: §4.1 recurring payments (highest "wow" per line of
code), §2.5 open-with import (highest friction removal), §2.4 manual
transfer toggle (small, fixes a real distortion), §6.4 app lock (first
review complaint otherwise), §2.3 credit cards (biggest accuracy gain,
biggest build).
