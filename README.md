# WealthFlow

A privacy-first personal finance app. Extracts and categorizes transactions
from bank statement PDFs entirely on-device — no AI models, no server-side
processing of financial data. The account keeps only sign-in details, the
profile, and the user's categorisation rules.

- **New here?** Read [docs/ENGINEERING_HANDBOOK.md](docs/ENGINEERING_HANDBOOK.md):
  what the app does, the stack, how every part works, how to run and ship.
- **Architecture decisions and conventions:** [CLAUDE.md](CLAUDE.md).
- **History of the redesign, PR by PR:** [docs/REDESIGN_PLAN.md](docs/REDESIGN_PLAN.md).

```bash
npm install
npx expo start --port 8081
npx expo run:android --no-bundler
npx jest
```
