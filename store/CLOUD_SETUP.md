# Cloud Worker for Play release (optional)

Crash reports, daily leaderboard and cross-device sync need a Cloudflare Worker.

## Deploy
1. Follow `cloud/README.md`
2. Set `ALLOWED_ORIGINS` to your Pages origin and Capacitor origins if needed
3. Put the public URL into:
   - `<meta name="ottisk-cloud-api" content="https://YOUR.workers.dev" />` in `index.html`, or
   - in-game advanced cloud settings

## Email auth
Migration `0003_email_accounts.sql` adds email/password columns.
Apply migrations before relying on `/v1/register/email` and `/v1/login`.

Without a Worker URL the game stays fully offline: local saves, local accounts, local analytics, and an on-device leaderboard (`#local-leaderboard`) filled from finished runs.

## Local board
- Top scores on the current device are written after each run.
- Cloud daily board still needs a Worker URL + account; the local list works without it.
