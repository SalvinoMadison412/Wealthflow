# WealthFlow privacy policy

> **DRAFT for the owner to review.** Fill in the `<placeholders>`, have it read
> by someone qualified, then host it at a public URL. It must stay true to the
> code: change it in the same PR as any change to what data leaves the phone.

Last updated: `<date>`

WealthFlow ("the app") is a personal finance app operated by `<your name or
company>` (contact: `<contact email>`).

## What stays on your phone

Your bank statement PDFs, the transactions read from them, your accounts,
budgets and insights are processed and stored **only on your device**. They are
not uploaded to us or anyone else. No AI or machine-learning service reads them:
transactions are sorted by fixed rules on your device. If you delete the app or
switch phones, this data is gone; importing your statements again restores it.

## What we store on our servers

When you sign in we keep:

- **Sign-in details** from Google (your account identifier and email).
- **Your profile**, as you enter it: name, email, phone number, age range,
  monthly income range, main goal and occupation.
- **Your categories and rules**: category names, colours and budgets, and the
  merchant patterns and amount thresholds you write to sort transactions.

This is stored with our backend provider, Supabase (region: India, ap-south-1).
Each user can only read and change their own rows.

## How we use it

To sign you in, personalise the app, and restore your rules on a new phone. We do
not sell your data, share it for advertising, or use it for analytics. The app
contains no advertising, analytics or crash-reporting SDKs.

## Who else is involved

- **Google**, for sign-in (subject to Google's privacy policy).
- **Supabase**, which hosts the account database.

## Keeping and deleting data

We keep the server data above until you delete your account. In the app, go to
Menu > Profile > **Delete account**: it immediately removes your account, profile
and synced rules from our servers and everything stored on your device. If you
can't open the app, email `<contact email>` from the address on your account and we
will delete the server data within 30 days. Profile > Wipe all data removes your
local data and synced rules but keeps your account.

## Security

Data is sent over HTTPS. Access to server data is restricted by row-level
security so users can only reach their own rows.

## Children

WealthFlow is for adults (18+). We do not knowingly collect data from children.

## Changes

We will post changes here and update the date above.

## Contact

`<contact email>`
