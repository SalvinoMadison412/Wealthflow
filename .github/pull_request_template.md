## What
<!-- What changes, in a sentence or two. One logical change per PR. -->

## Why
<!-- The problem or need. Link an issue if there is one. -->

## How it was tested
<!-- `npx tsc --noEmit && npx jest`, plus what you checked by hand on the emulator. -->

## Checklist
- [ ] `npx tsc --noEmit` and `npx jest` pass
- [ ] No AI/LLM in parsing or categorisation; no statement or transaction data leaves the device
- [ ] No real bank statements or personal financial data in the diff
- [ ] `docs/ENGINEERING_HANDBOOK.md` updated if behaviour, schema, stack or process changed
- [ ] Privacy claims in user-facing copy are still true
- [ ] Schema change? New migration file added, RLS on new tables, noted that it is applied by hand
