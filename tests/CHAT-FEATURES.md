Chat changes: foreground activity heartbeat, last-seen/online timestamps, unread badges and latest-message ordering, sent/delivered/read receipts, opt-in browser notifications while the app remains open, and private photo attachments up to 5 MB. Photos can be attached using the paperclip; persistent message pinning is not included.

Passed: TypeScript, production build, two-account authenticated integration checks for online/offline timestamps, delivery and read acknowledgements, sender realtime receipt updates, receiver content tampering rejection, private photo reload/access, and anonymous photo access rejection. Desktop/mobile composer visibility passed, including simulated visual viewport keyboard opening/closing. Temporary accounts and uploaded test photos were removed.

Not verified on physical devices: real keyboard/browser chrome and safe-area behavior. Browser notification display needs permission and browser support; this is not push delivery after the app is closed. Abrupt disconnects expire the heartbeat after 90 seconds, with the next client refresh showing offline. Last seen is the most recent heartbeat rather than an exact disconnect timestamp.

Integration test: with two disposable authenticated accounts, set TEST_EMAIL_A/B and TEST_PASSWORD and run node tests/chat-features.e2e.cjs against npm run dev. This makes writes for those accounts only; use no real customer accounts. UI regression: node tests/chat-layout.cjs uses mocked service data.

The additive database migrations have already been applied to the connected Supabase project. Frontend changes are pending publication separately from Suggested Peers.
