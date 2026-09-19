# Contributing to WealthFlow

Read [CLAUDE.md](CLAUDE.md) and the [handbook](docs/ENGINEERING_HANDBOOK.md) first. Setup is in the
[README](README.md).

## Non-negotiable rules

A PR that breaks one of these will not be merged.

1. **No AI/LLM in parsing or categorisation.** Both are deterministic.
2. **On-device only.** Statements and transactions are never uploaded by default.
3. **Rule-based categorisation:** merchant patterns and amount thresholds, first match wins,
   "Uncategorized" fallback.
4. **Supabase holds only non-sensitive data** (profile, categories, rules).
5. **Reconciliation is the parsing check:** opening + credits - debits = closing.
6. **Expo managed workflow.** No custom native modules unless managed can't do the job.

## Workflow

1. Branch from an up-to-date `main`. Never commit to `main`.
2. Name the branch by type: `feat/`, `fix/`, `docs/`, `chore/` + a short slug.
3. One logical change per PR. Stacked PRs are fine if you say so in the description.
4. Before pushing:
   ```bash
   npx tsc --noEmit && npx jest
   ```
5. Open a PR against `main` using the template. CI must be green to merge.
6. If the change alters behaviour, schema, stack or process, update the relevant section of
   `docs/ENGINEERING_HANDBOOK.md` in the same PR.

## Code conventions

- Standard library and platform features before dependencies; no speculative abstractions.
- Pure logic goes in `src/data` or `src/statement` and gets a unit test. Anything importing
  `expo-sqlite` or Supabase can't load under Jest, so keep decisions out of it.
- A deliberate shortcut with a known ceiling gets a `ponytail:` comment naming the ceiling and
  the upgrade path.
- User-facing text makes privacy claims. If a change makes one untrue, change the copy too.
- `android/` and `ios/` are generated; don't edit or commit them.

## Data safety

Never commit, attach to an issue, or paste real bank statements or transactions. Use the
synthetic fixture in `src/statement/fixtures/` or redact heavily. Local files go in
`fixtures/local/` (gitignored).

## Database changes

Add a new timestamped file in `supabase/migrations/`; never edit an applied one. Migrations are
applied by hand in the Supabase dashboard, so say so in the PR. Every table needs row-level
security.
