# Releasing to Google Play (internal testing)

How to get WealthFlow onto Play's **internal testing** track: up to 100 named
testers, no review wait, installs from the Play Store. This is the first
milestone; closed and production tracks come later (see "Before production").

The app is **Android only** for now (`platforms: ["android"]` in `app.json`).
Everything here stays in Expo's managed workflow (EAS Build). No custom native
code, no `android/` folder committed.

## One-time setup (owner does these; they involve accounts, payment, sign-in)

1. **Google Play Console** developer account ($25 one-time, identity
   verification). A personal account created after Nov 2023 must run a closed
   test with at least 12 testers for 14 days before it can publish to production.
2. **Expo account**, then from the repo: `npx eas-cli login` and
   `npx eas-cli init`. This is a WealthFlow-only EAS project; it writes
   `extra.eas.projectId` and `owner` into `app.json`, so commit that in its own PR.
   Done: `@kevin.madison/wealthflow`. The Android keystore lives on Expo's servers
   (remote credentials); never commit one.
3. **Build environment variables.** `.env.local` is gitignored and is not
   uploaded to EAS, so a cloud build would ship without Supabase settings.
   Create both for each of `preview` and `production`:
   ```bash
   npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value "<project url>" --environment production --visibility plaintext
   npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<publishable key>" --environment production --visibility plaintext
   ```
   Repeat with `--environment preview`. Both values are the public client
   settings already embedded in every install; never use a service-role key.
4. **Host the privacy policy** at a public URL. `docs/PRIVACY_POLICY.md` is the
   source; re-publish the web copy whenever it changes. Play requires the URL.
5. **Create the app** in Play Console: name WealthFlow, package
   `com.kevin.madison.wealthflow`, free, app category Finance.

## Try a build first (no store needed)

```bash
npx eas-cli build --platform android --profile preview
```

Produces an installable APK; install it on a phone, sign in with Google, import
a statement. Sign-in uses Supabase's web OAuth flow and the `wealthflow://auth`
redirect (already in Supabase's allow-list), so no SHA-1 is needed for it.
The Google consent screen is in Testing mode: only listed test users can sign in.

## Ship to internal testing

```bash
npx eas-cli build --platform android --profile production   # .aab, versionCode auto-increments
```

1. **First upload is manual.** Play Console > Testing > Internal testing >
   Create release > upload the `.aab` from the EAS build page. Accept Play App
   Signing (EAS holds the upload key).
2. Fill the mandatory forms: content rating, target audience (18+, the app's age
   ranges start at 18), ads (none), **Data safety** (below), privacy policy URL.
3. Testers tab: create an email list (Google accounts), add it, copy the opt-in
   link and send it to testers.
4. **Later releases** can be automated: create a Play service account key, keep
   it out of git, then `npx eas-cli submit --platform android --profile production`
   (the `internal` track is already set in `eas.json`).

Bump `version` in `app.json` for user-visible releases; `versionCode` is managed
by EAS (`appVersionSource: remote`). Every release goes through the normal
branch, PR and CI flow first.

## Data safety answers (draft; owner confirms)

| Play category | Answer | Why |
|---|---|---|
| Personal info: name, email, phone | Collected, not shared, needed for app functionality and account management | Onboarding profile stored in Supabase |
| Other profile data (age range, income range, goal, occupation) | Collected, not shared, app functionality / personalisation | Same `profiles` row |
| Financial info: statements and transactions | **Not collected** | PDFs are parsed on the device and stored only in local SQLite |
| Merchant patterns and amount thresholds (rules, categories) | Collected, not shared, app functionality. Decide whether to declare as "Other financial info" (conservative) | Synced to Supabase |
| Photos, files | Not collected | The PDF picker reads a file locally only |
| Location, contacts, messages, device ids, ads, analytics, crash logs | Not collected | No such SDKs (`package.json`) |
| Encrypted in transit | Yes | HTTPS to Supabase |
| Data deletion | Users can request deletion: in-app Profile > Delete account, and the web page `docs/DELETE_ACCOUNT.md` (host it, enter its URL as the "Delete account URL") | |

## Before production (not needed for internal testing)

- **Account deletion is built** (Profile > Delete account, backed by the
  `delete_my_account()` SQL function). Before production: apply
  `supabase/migrations/20260925000000_delete_my_account.sql` to the project, and
  host `docs/DELETE_ACCOUNT.md` and `docs/PRIVACY_POLICY.md` at public URLs.
- Publish the Google OAuth consent screen (and complete Google verification if
  asked), or only listed test users can sign in.
- Phone OTP needs an SMS provider, or stays hidden.
- Only Kotak Mahindra has a bank-specific parser; keep the first tracks small
  and collect other banks' statement layouts through testers (never real
  statements in the repo).
- Store listing assets: 512x512 icon, 1024x500 feature graphic, at least two
  phone screenshots, short and full description.
