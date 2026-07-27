# ОТТИСК Cloud

A dependency-free Cloudflare Worker/D1 API. Accounts are anonymous: registration
returns one recovery code and an opaque bearer session. The recovery code is
never returned again, so the player must keep it somewhere safe.

## Deploy

Prerequisites are a Cloudflare account and a recent Wrangler CLI. Wrangler is
only a deployment tool; the Worker has no runtime packages.

```sh
cd cloud
cp wrangler.toml.example wrangler.toml
npx wrangler d1 create ottisk-cloud
# Put the returned database_id in wrangler.toml.
npx wrangler d1 migrations apply ottisk-cloud --remote
npx wrangler secret put TOKEN_PEPPER
npx wrangler secret put CRASH_PEPPER
npx wrangler deploy
```

Use independent random values of at least 32 bytes for both secrets. Set
`ALLOWED_ORIGINS` to comma-separated, exact production origins. `*` is
supported for development but is not recommended. Never commit the resulting
`wrangler.toml` if it contains account-specific IDs.

Load `js/cloud.js` in the game, then configure it once:

```js
OttiskCloud.configure({
  apiUrl: "https://ottisk-cloud.example.workers.dev",
  release: "1.1.0",
  platform: "web",
});
```

The configuration and bearer session are saved in local storage. The recovery
code intentionally is not. With an empty `apiUrl`, all methods are no-ops and
no network request or queue entry is made.

## API

All bodies and responses use JSON. Authenticated routes require
`Authorization: Bearer <sessionToken>`.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/v1/register` | No | Create account, recovery code, and session |
| POST | `/v1/recover` | No | Exchange recovery code for a new session |
| POST | `/v1/logout` | Yes | Revoke the current session |
| GET/PUT | `/v1/save` | Yes | Read or replace sanitized save data |
| POST | `/v1/scores/daily` | Yes | Keep the account's best score for today |
| GET | `/v1/leaderboards/daily?day=YYYY-MM-DD` | No | Top 100 daily scores |
| GET | `/v1/leaderboards/season?season=YYYY-MM` | No | Top 100 monthly totals |
| POST | `/v1/crashes` | No | Increment an anonymous crash aggregate |

Registration returns `{ accountId, recoveryCode, sessionToken }`; recovery
returns `{ accountId, sessionToken }`. A save is sent as `{ save: ... }`.
Daily score input is `{ score, displayName? }`. Dates are assigned by the
server in UTC. Display names are optional and limited to 24 characters.

Crash input contains only a client-side hash (`fingerprint`) and short
allow-listed tags (`release`, `platform`, `category`). Raw errors, stacks,
URLs, IP addresses, user agents, and account IDs are not stored. Cloudflare
may still process request metadata under its own service policy.

## Operational notes and limitations

- Scores are client-reported and therefore are not cheat-proof. Authoritative
  validation requires server-verifiable gameplay data.
- Offline writes are kept in a local queue of at most 25 entries. Saves
  coalesce to the newest value, same-day scores to the highest value, and
  duplicate crashes to one entry. The queue is best effort and local-storage
  eviction can remove it.
- Sessions expire after 90 days. Schedule occasional D1 maintenance to delete
  expired sessions and old crash aggregates if desired.
- Public crash ingestion can be spammed. Apply a Cloudflare WAF rate-limit
  rule to `POST /v1/crashes` for production; doing this in D1 would require
  retaining a requester identifier, contrary to the privacy design.
- Save sanitization strips purchase-entitlement fields (`iapHeroes` and
  `starterPackBought`), limits JSON to 64 KiB and nesting to 12 levels.
  Purchases must be restored through the relevant store.
- Recovery codes cannot be viewed or changed. Losing the code and all active
  sessions means the anonymous account cannot be recovered.

## Tests

With Node 20 or newer:

```sh
node --test cloud/test/*.test.mjs
node --check cloud/src/worker.mjs
node --check js/cloud.js
```
