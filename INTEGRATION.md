# Hosted Supabase integration

The Amplify build is a static Vite frontend. Its application API calls now run on Supabase Edge Functions instead of `/api/*` on the static origin. The optional local Express server remains available for development; it is not included in the static deployment.

## Runtime

- `ai-chat`: validates the authenticated user, saves the prompt and reply, and returns the session ID. The UI reloads saved messages, supports older `model` and newer `assistant` roles, and shows provider/storage failures instead of fabricated successful replies.
- `app-api`: authenticated translation, skills, roadmap, safety analysis, YouTube metadata, and study-guide endpoints. AI results are saved in `user_api_results` under ownership RLS. Summaries use the supplied title and notes; they do not claim to have watched the video.
- `database-access`: authenticated access to the caller's profile, replacing the placeholder table query.
- Browser sessions persist and refresh via the shared Supabase client. Database calls use the signed-in user's UUID; no service-role credentials are shipped to the browser.
- Database writes use the live schema for network posts, follows, conversations, messages, YouTube tracks, opportunities, tools, certificates, and scan reports. Settings are saved to `app_settings`. Private generated roadmaps are stored as documents rather than invalid foreign keys into the shared catalog.
- Direct-message and follow events use database Realtime subscriptions. Reloading chat fetches stored history. Visible history is capped at the latest 100 AI messages and 500 network messages.

## Deployment

The additive migration `20260916064012_hosted_api_persistence.sql` and the three Edge Functions were applied to project `nzgisrrrbabedlntmcoc` during this repair. Keep these sources with the application. The migration assumes the project's existing schema; it is not a fresh database bootstrap.

Amplify should build this repository with `npm ci` and `npm run build`, and publish `dist` (see `amplify.yml`). The frontend must be redeployed for the routing and storage changes to reach users.

Optional build variables are `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy `VITE_SUPABASE_ANON_KEY` is also accepted). The checked-in defaults target this existing project. `OPENAI_API_KEY` and optional `OPENAI_MODEL` belong in Supabase Edge Function secrets. Auth redirect URLs must include the active hosted origin. Private keys must never be placed in `VITE_*` variables.

## Verification and limits

- TypeScript checking and the Vite production build pass. Vite reports a pre-existing large bundle warning.
- All three Edge Functions pass Deno type checking and deployed CORS / unauthenticated-rejection smoke checks (`python tests/hosted_api_smoke.py`).
- Live transactional database checks passed for authenticated chat messages, direct messages, YouTube progress, private AI result writes/reads/deletes, cross-user read/write denial, and ownership-reassignment denial. Test changes were rolled back.
- A payload audit compared literal database write fields against the live schema.
- An actual signed-in browser session and a working provider credential are still needed to verify AI responses, token refresh across expiry, and reload behavior on the final Amplify deployment. No claim of complete end-to-end verification is made by the build or anonymous smoke checks.
- Shared catalogs and webinar creation retain their existing RLS restrictions. This repair does not grant all users permission to administer catalog content. Existing mock catalog data is not converted into real database records.
- Supabase advisors still flag public execution privileges on existing security-definer trigger functions and disabled leaked-password protection. These pre-existing settings were not broadened by this repair.

References: [Supabase CORS](https://supabase.com/docs/guides/functions/cors), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database advisors](https://supabase.com/docs/guides/database/database-linter).
