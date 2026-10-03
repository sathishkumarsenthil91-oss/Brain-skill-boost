# Learning and certificate checks

Run `npm run lint`, `npm run build`, and `node tests/learning-certificates.cjs` with the development server on port 3000.

The browser fixture checks 85%, 99%, unknown duration, and fully completed saved progress; failed claims do not show Claimed; successful claims remain after reload; copying, downloading, keyboard dismissal, and 360/390/1440px layouts work. Browser data is mocked; this does not send posts to real users or claim certificates on their behalf.

`tests/certificate-claim.sql` was run against the connected database inside a rolled-back transaction. It checks incomplete and rounded-up progress rejection, successful persisted claims, repeated claim idempotence, and account ownership. The Supabase security advisor reports only the existing disabled leaked-password protection warning.

Progress uses the existing player's saved watched-second counters. This is a self-directed Brain Boost learning record, not independent identity/skill verification or a certificate issued by YouTube. Existing historic certificates are retained. Downloads are printable HTML; use Print > Save as PDF. Device app sharing depends on the installed apps; LinkedIn copies text for the user to paste. Browser UI checks do not establish third-party publication success.
