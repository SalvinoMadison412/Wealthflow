# WealthFlow production notes

A running record of every change we merge, written so it can be reused when
we apply for Google Play production access and write store release notes.
Each entry says what problem we saw (often from a closed-test tester), what
we changed, what the user notices, and how we checked it.

**How to use this file**
- Add an entry for **every PR we merge**, in the same shape as the ones below.
- Keep "What prompted it" honest: name the tester report, review or test that
  led to the change. Play asks how testing and feedback shaped the app.
- The "Release note" line is written for users (no jargon, under 500
  characters) and can be pasted into Play Console as is.

---

## Summary for the production access application

Use this as the starting point for Play Console's production questions
(testing, feedback, changes made). Update it as entries are added.

- **How we tested:** closed testing on Google Play with real users, plus our
  own testing on an Android emulator (Pixel 10 image) using release builds.
  Automated checks: 360+ unit tests on the statement reader, and end-to-end
  tests (Maestro) that install the app, sign in as a guest and import
  statements the way a user does.
- **What testers told us and what we changed:**
  - A tester could not import a statement, then it worked hours later. We
    found the cause (Android shutting down the app's hidden PDF reader in the
    background) and made the reader restart itself (PR 73).
  - Statements from banks other than Kotak did not import. We rebuilt the
    statement reader so it handles many banks' layouts (PRs 76, 77, 79).
  - A PDF with no transactions showed a misleading "Balanced" result. It is
    now rejected with a clear message (PR 74).
- **How we protect accuracy:** every imported statement is checked against
  its own running balance, row by row. The app tells the user when every
  transaction was read, lists any row it could not read or that does not add
  up, and labels statements it could not fully verify as "Unverified" instead
  of showing them as correct.
- **Privacy:** statements are read on the phone. The PDF and transactions are
  never uploaded, and no AI reads them.

---

## PR 73: PDF reader recovers instead of hanging

- **Status:** open (not merged yet)
- **Link:** https://github.com/SalvinoMadison412/Wealthflow/pull/73

**What prompted it.** A closed-test tester reported that importing a
statement did not work, but the same statement imported fine 6-7 hours later.

**Problem.** The app reads PDFs with a hidden in-app browser component that
stays alive for the whole session. When Android shuts down that component in
the background (common when memory is low or the app sits idle), the app never
noticed. Every import after that waited forever on a spinner, and only
restarting the app (which Android eventually did on its own) fixed it.

**Solution.**
- The reader now confirms it received each request. If it doesn't reply
  within seconds, or Android reports it was shut down, the app restarts the
  reader automatically.
- An import that was caught by the restart retries once by itself, so the user
  normally doesn't see an error at all.
- If the reader still can't respond, the user gets a clear "try again"
  message instead of an endless spinner.

**What the user notices.** Imports no longer hang after the app has been in
the background for a while.

**How we checked it.** Reproduced the tester's problem on the emulator by
forcing the reader to crash: before the fix the import spun for over a minute;
after the fix the same import completed. Automated tests cover the timeouts
and restart.

**Release note.** Fixed an issue where importing a statement could get stuck
after the app had been in the background. The app now recovers automatically.

---

## PR 74: Clear error for PDFs with no transactions

- **Status:** open (not merged yet)
- **Link:** https://github.com/SalvinoMadison412/Wealthflow/pull/74

**What prompted it.** Found while investigating the import problem above.

**Problem.** If a PDF had no readable transactions (a scanned statement, an
unsupported layout, or not a bank statement at all), the app said
"Extracted 0 transactions" with a green "Balanced" badge, because 0 + 0 = 0.
It also asked which account the file belonged to and saved an empty
statement. Users could think the import had worked.

**Solution.** Such a PDF is now rejected before anything is saved, with the
message "No transactions found in this PDF. It may be scanned or in a layout
we don't support yet." Errors from the file picker are also handled instead
of failing silently.

**What the user notices.** A clear message instead of a misleading success
screen.

**How we checked it.** Imported a non-statement PDF on the emulator: the error
showed, with no green badge and no empty statement saved. Covered by an
end-to-end test (PR 75).

**Release note.** PDFs that contain no transactions now show a clear message
instead of an empty "balanced" result.

---

## PR 75: Automated end-to-end tests

- **Status:** open (not merged yet)
- **Link:** https://github.com/SalvinoMadison412/Wealthflow/pull/75

**What prompted it.** We wanted every release checked the way a user uses the
app, so problems like the import hang are caught before testers see them.

**Problem.** Statement import, the app's main feature, was only tested by hand.

**Solution.** Added Maestro end-to-end tests that run on an Android device or
emulator:
- the app installs, opens, signs in as a guest and reaches the home screen;
- a sample statement imports, shows the right number of transactions, shows
  "Balanced" and appears in the Transactions list;
- a PDF that isn't a statement is rejected with a clear message.

The sample PDFs are made-up data; no real bank statement is stored in the
project. How to run the tests is documented for the team.

**What the user notices.** Nothing directly; fewer bugs reach releases.

**How we checked it.** Ran all three tests on the emulator against release
builds; they pass (the rejection test passes once PR 74 is in).

**Release note.** Not user-facing (internal testing).

---

## PR 76: Statements from more banks

- **Status:** open (not merged yet)
- **Link:** https://github.com/SalvinoMadison412/Wealthflow/pull/76

**What prompted it.** We tested whether statements from India's major banks
import correctly. Only Kotak Mahindra Bank's layout worked.

**Problem.** The statement reader expected exactly Kotak's table: a serial
number, a date like "07 Mar 2026", and two amounts at the end of each line.
Other banks print dates differently (07/03/26, 07-03-2026, 07-Mar-2026), add
"Dr"/"Cr" after amounts, put extra columns at the end, or print the opening
balance on a separate line, so their rows were not read at all. Any statement
mentioning "Opening Balance" was also labelled "Kotak Mahindra Bank".

**Solution.**
- Rows are recognised by their shape instead of Kotak's exact layout: optional
  serial number, six date formats, Dr/Cr markers, extra trailing columns,
  Indian lakh grouping (1,20,000.00), and rows where the amount comes first.
- The opening balance is found even when printed on the line below its label.
- The bank's name is taken from the statement's own heading, not guessed; if
  the statement doesn't name its bank, the user types it.
- Kotak statements are read exactly as before, so re-importing an old
  statement never creates duplicates.

**What the user notices.** Statements from more banks import; the bank field is
no longer wrongly pre-filled with "Kotak".

**How we checked it.** Test statements in ten other banks' layouts now import
with every transaction and balance correct; a real Kotak statement (145
transactions) gives identical results to before. Two layouts were also
imported on the emulator.

**Release note.** Added support for statements from more banks, including
different date formats and layouts.

---

## PR 77: Reads real bank tables and proves nothing was missed

- **Status:** open (not merged yet)
- **Link:** https://github.com/SalvinoMadison412/Wealthflow/pull/77

**What prompted it.** Real SBI and HDFC statements shared for testing still
imported only partly (SBI 8 of 57 rows). We also asked an internal review
panel whether the approach was right; it pointed out gaps we then fixed.

**Problem.**
- Real statements wrap a transaction's description over several lines and
  print amounts slightly above or below the date, so many rows were missed.
- Whether an amount was money in or out was guessed from the balance, which
  could get the first row backwards.
- Nothing told the user if rows were missing.
- Statements printed newest-first, and "balance brought/carried forward"
  rows, were not handled.

**Solution.**
- The app now reads the statement as a table: it finds the column headings,
  treats everything from one date to the next as one transaction, and decides
  money in or out from the column the amount sits in.
- **Coverage check:** after every import the app says "All 29 transactions in
  the PDF were read", or lists exactly which rows it couldn't read and which
  don't match the running balance. A statement is only marked "Balanced"
  when everything checks out.
- Statements the app can only read line by line are labelled "Unverified"
  instead of "Balanced".
- Newest-first statements and brought/carried-forward rows are handled.

**What the user notices.** More complete imports, and an honest summary of
what was read, so they never silently get wrong numbers.

**How we checked it.** Real Kotak statement: 145 of 145 rows, identical to
before. Shared SBI/HDFC statements: SBI 53 of 57 rows (was 8), HDFC 28 of 29;
the remaining flagged rows were ones that had been altered in those files.
Checked on the emulator, and 350+ automated tests pass.

**Release note.** Better reading of bank statements, and the app now tells you
whether every transaction in your statement was read and balanced.

---

## PR 79: Reads layouts it has never seen

- **Status:** open (not merged yet)
- **Link:** https://github.com/SalvinoMadison412/Wealthflow/pull/79

**What prompted it.** India has hundreds of smaller banks (small finance,
co-operative, regional rural). Our review panel recommended making the app
work out an unfamiliar layout by itself, instead of trying to copy each bank's
format.

**Problem.** If the app didn't recognise a statement's column headings
(unusual wording, Hindi headings, no headings, or a single "Amount" column
with a Dr/Cr marker), it fell back to a simpler reader that could only mark
the import "Unverified".

**Solution.** The app now finds the columns from the numbers themselves. It
lines up the amounts on the page, tries each possible meaning (money out,
money in, balance, or one amount column with Dr/Cr), and keeps the one where
every balance follows from the previous one. Safety rules stop it from
accepting a lucky guess: enough rows must add up, one answer must clearly win,
and the statement's printed closing balance must match. If not, the import
stays "Unverified".

**What the user notices.** Statements from less common banks and unusual
layouts can import fully verified.

**How we checked it.** With its headings removed, the real Kotak statement was
still read perfectly (145 of 145) by the new method alone. A PNB-style
statement now shows "Balanced" on the emulator instead of "Unverified".
Automated tests cover unusual headings, Hindi headings, no headings, Dr/Cr and
signed amounts, and the safety rules.

**Release note.** The app can now read statement layouts from many more banks,
including less common ones, and checks every balance to make sure the import
is correct.

---

## PR 80: Fixes found by testing 25 bank layouts

**What prompted it.** We generated synthetic statements for 25 banks, modelled
on public sample images, and ran them through the reader. Several showed gaps,
which this change closes.

**Problem.** Some layouts put the Dr/Cr cell left of the amount or spell it
DEBIT/CREDIT, prefix amounts with ₹ or Rs, print 0.00 in the empty
Withdrawal/Deposit cell, use "Details" or "Withdrawals" headings, or show an
opening balance as Dr. Several banks were not named.

**Solution.** The reader now pairs each Dr/Cr cell with the nearest amount on
its line (either side), accepts currency signs and DEBIT/CREDIT, ignores the
zero in the empty cell, reads Dr opening balances as negative, recognises
those headings and page totals, and names 13 more banks.

**What the user notices.** More statements import fully verified, with the
right bank name.

**How we checked it.** 379 unit tests pass, including new layout-gap tests.
23 of 25 synthetic layouts now read every row; RBL and Indian Overseas Bank do
not yet. These are synthetic, so real tester statements are still needed.

**Release note.** The app now reads more statement layouts, including ones
with ₹ amounts and separate Debit/Credit columns, and recognises more banks.

---

## PR 81: One month and year picker for Home and Transactions

**What prompted it.** Our own testing with several years of statements: older
years were hard to reach (the month picker only went back 12 months), and
Home and Transactions each had a separate picker.

**Problem.** People with more than a year of statements could not easily open
an earlier year, and changing the month on Home did not carry over to
Transactions.

**Solution.** Home and Transactions now share one ‹ Month Year › picker that
steps through every month with data. A small note under it, "Change year in
Filters", opens the Filters sheet, where the year is picked. Tapping the month
shows the whole year. Month and year filtering also uses the date index, so
it is faster.

**What the user notices.** Changing the month on one screen changes it on the
other, and any earlier year is two taps away.

**How we checked it.** 205 unit tests, plus an emulator run with 21,000 test
transactions across 2021–2026: picking 2023 in Filters showed December 2023 on
both screens, stepping crossed from December 2023 into January 2024, and the
whole-year view showed year totals. A design review against a mobile UI
checklist led to larger tap areas, even spacing and a one-line year row.

**Release note.** Home and Transactions now share one month picker, and you
can jump to any earlier year from Filters.

---

## PR 83: Search transactions by merchant

**What prompted it.** A request from the owner during testing: finding one merchant in a long list took too much scrolling.

**Problem.** There was no way to look up a transaction by name.

**Solution.** A search icon on the Transactions tab opens a "Search merchant" field. Partial names match (typing "swi" finds Swiggy), ignoring capital letters, and the search also looks in the bank's description text. It works together with the month, account and Filters.

**What the user notices.** Type a few letters and the list narrows; the totals follow.

**How we checked it.** Unit tests for the matching rule, plus a run on the Android emulator with partial text, no matches and clearing the search.

**Release note.** You can now search your transactions by merchant name. A few letters are enough.

---

## PR 84: Partial months are shown as partial

**What prompted it.** A statement that covers only part of a month (for example 1–15 October) imported as "Balanced", and Home, the chart and Budget treated it as the full month.

**Problem.** Totals and the "you spent X% of your income" message looked complete when they were not, and nothing said which days were missing.

**Solution.** The app reads the statement period the bank prints and works out, per account, which days each month covers. A small note under the month says what is covered or missing ("Missing 16–19 Sept"); an ⓘ button opens a sheet with each account's covered and missing days and the statements behind them. Partial months are faded in the chart, Budget says "spent in 15 of 31 days", Home suggests importing the missing days, and the Statements screen lists gaps between statements.

**What the user notices.** An honest picture of which days the numbers cover.

**How we checked it.** Unit tests for reading five printed-period formats and for the day maths, plus an emulator run with a second account that had two partial September statements. Not yet checked on real bank PDFs.

**Release note.** The app now tells you when a statement covers only part of a month and shows which days are missing.

---

## PR 86: A calmer overspend message

**What prompted it.** Design review: the pink "Red flag" banner under the Home chart repeated what the red bars and warning icons already showed, and looked unbalanced.

**Problem.** Three alarms for one fact.

**Solution.** The banner and the per-bar warning icons are gone. One quiet grey line above the chart says "Spent 196% of income in October".

**What the user notices.** A cleaner chart card.

**How we checked it.** Emulator run on Home. The "No income" wording and dark mode were not checked.

**Release note.** The income-versus-expenses chart is cleaner: one plain line replaces the red warning banner.

---

## PR 87: Account filter moved into Filters

**What prompted it.** Design review: the "All accounts" dropdown under the header looked out of place on every screen.

**Problem.** A plain pop-up list that felt unfinished, shown even with one account.

**Solution.** Choosing an account now lives in the Filters sheet. While one account is picked, a small removable chip shows it under the month on Home, Transactions and Budget. This also fixed a crash when an account was picked on Transactions.

**What the user notices.** No dropdown on any screen; the account is a normal filter.

**How we checked it.** Emulator run with two accounts: picking, the chip, clearing it. Budget's chip and dark mode were not checked.

**Release note.** Pick which account to look at from Filters. A small chip shows it while it is active.

---

## PR 88: A simpler Transactions screen

**What prompted it.** Design review: the Transactions tab stacked a big title, a Filters button, the month, three totals tiles and a category label on every row before the first transaction.

**Problem.** Too much before the data.

**Solution.** One row holds the month picker with search and Filters icons. One line shows "In · Out · Net". Rows show the category as plain grey text, and nothing when a row has no category yet. A quiet "N uncategorized · Review" row narrows the list to those. Day headers read "Wed 28 Oct".

**What the user notices.** More transactions on screen, with the same information.

**How we checked it.** Emulator run against the approved design. Tapping Review and dark mode were not checked.

**Release note.** Transactions is simpler: one controls row, one totals line, and a quick way to review uncategorized transactions.

---

## PR 89: Owed to you / You owe

**What prompted it.** A request from the owner: tag money that friends owe you (or you owe) and see it on Home.

**Problem.** Splitting a bill or paying for a friend left no trace in the app.

**Solution.** From a transaction, mark part or all of it as "Owed to you" or "You owe", naming the person and the amount; add more people for a split. Home shows an Owed card only when something is outstanding. An Owed screen groups it by person, with a Settle button. It is a note only: spending totals and balance checks do not change. It is stored on the phone only.

**What the user notices.** A clear list of who owes whom, and nothing extra on Home when nobody does.

**How we checked it.** Unit tests for the split rules and grouping; emulator run: tag, see the Home card, open the Owed screen, settle, and the card disappears. A three-way split, "You owe", editing, and deleting a statement removing its entries were not checked on the emulator.

**Release note.** Track money friends owe you, or you owe them, from any transaction. Nothing shows on Home until you add someone.

---

<!-- Add new entries above this line, newest last, using the same headings:
What prompted it / Problem / Solution / What the user notices / How we checked it / Release note -->
