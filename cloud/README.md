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

Optionally load `js/social.js` after `js/cloud.js`. It exposes
`OttiskSocial` and reuses the same API URL/session storage. Its methods return
`null` without making a request when the backend is disabled, the account is
unlinked, the browser is offline, or a network request fails. Verified scores
are deliberately not queued because their nonces expire.

## API

All bodies and responses use JSON. Authenticated routes require
`Authorization: Bearer <sessionToken>`.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/v1/register` | No | Create account, recovery code, and session |
| POST | `/v1/recover` | No | Exchange recovery code for a new session |
| POST | `/v1/logout` | Yes | Revoke the current session |
| GET/PUT | `/v1/save` | Yes | Read or replace sanitized save data |
| GET | `/v1/social/profile` | Yes | Get/create this account's friend code |
| GET/POST | `/v1/friends` | Yes | List friends or add one by friend code |
| DELETE | `/v1/friends/:friendCode` | Yes | Remove a friendship |
| POST | `/v1/scores/challenge` | Yes | Issue a short-lived one-use score nonce |
| POST | `/v1/scores/daily` | Yes | Validate proof and keep today's best score |
| GET | `/v1/leaderboards/daily?day=YYYY-MM-DD` | No | Top 100 daily scores |
| GET | `/v1/leaderboards/season?season=YYYY-MM&league=gold` | No | Top 100 monthly totals, optionally by league |
| GET | `/v1/leagues/season?season=YYYY-MM` | Yes | Current account's seasonal league/rank |
| GET/POST | `/v1/duels` | Yes | List duels or challenge a friend with a ghost |
| POST | `/v1/duels/:id/result` | Yes | Record the challenged friend's result |
| POST | `/v1/crashes` | No | Increment an anonymous crash aggregate |

Registration returns `{ accountId, recoveryCode, sessionToken }`; recovery
returns `{ accountId, sessionToken }`. A save is sent as `{ save: ... }`.
Dates and seasons are assigned by the server in UTC. Display names are
optional and limited to 24 characters.

### Friends, leagues, and ghost duels

`GET /v1/social/profile` lazily creates an eight-character random friend code
and returns it formatted as `ABCD-2345`. Codes are case-insensitive public
locators, not secrets or credentials. `POST /v1/friends` accepts
`{ friendCode, displayName? }` and creates the symmetric friendship
immediately. Friend lists are capped at 200 entries per response.

Season score is the sum of an account's best score on each UTC day in the
month. Leagues are deterministic: bronze below 10,000, silver from 10,000,
gold from 50,000, and obsidian from 250,000. They reset naturally each month.
The public seasonal board includes `league`; its optional `league` query is
one of `bronze`, `silver`, `gold`, or `obsidian`.

Creating a duel requires an existing friendship and this body:

```json
{
  "friendCode": "ABCD-2345",
  "score": 4200,
  "displayName": "Игрок",
  "nonce": "...",
  "replayProof": {
    "durationMs": 12000,
    "samples": [[0, 1, 0], [6000, 2, 18], [12000, 0, 42]],
    "checksum": "64 lowercase hex characters"
  }
}
```

Request the nonce first with
`POST /v1/scores/challenge {"purpose":"duel_create"}`. The challenged account
receives the bounded challenger ghost in `GET /v1/duels`, requests a nonce
with `{"purpose":"duel_result","duelId":"..."}`, then posts the same
score/proof shape to `/v1/duels/:id/result`. Lists return at most 50 newest
records. Only the target can complete a pending duel, and it can do so once.

### Casual replay integrity protocol

Before a daily score, call:

```http
POST /v1/scores/challenge
Authorization: Bearer <sessionToken>
Content-Type: application/json

{"purpose":"daily"}
```

The response nonce expires after 10 minutes and can be consumed once by its
account and purpose. Submit `/v1/scores/daily` with
`{ score, displayName?, nonce, replayProof }`. A version-1 proof contains:

- `durationMs`: integer from 250 through 3,600,000.
- `samples`: 2 through 96 compact `[timeMs, action, value]` integer tuples.
  Times must strictly increase, remain in the duration, begin within five
  seconds of zero, and finish within five seconds of the duration. Action is
  0–31 and value is -1,000,000–1,000,000.
- `checksum`: lowercase SHA-256 hex of the exact UTF-8 string
  `nonce + "\n" + score + "\n" + durationMs + "\n" + JSON.stringify(samples)`.

`OttiskSocial.submitDailyScore`, `createDuel`, and `completeDuel` perform the
nonce/proof exchange. `OttiskSocial.replayProof` is available when callers
need lower-level control. The existing routes remain in place, but daily score
submissions without a valid nonce and proof are rejected.

Crash input contains only a client-side hash (`fingerprint`) and short
allow-listed tags (`release`, `platform`, `category`). Raw errors, stacks,
URLs, IP addresses, user agents, and account IDs are not stored. Cloudflare
may still process request metadata under its own service policy.

## Operational notes and limitations

- Replay validation is casual anti-cheat, not authoritative verification. It
  rejects malformed/oversized traces, stale or replayed submissions, and
  checksum inconsistencies. A modified client can still fabricate plausible
  samples and a matching checksum. Strong anti-cheat requires deterministic
  server replay or authoritative server-side simulation.
- Friend codes can be shared or guessed and adding is immediate; do not use
  them for authentication or private-data authorization.
- Ghost samples and duel scores are visible to both duel participants. Do not
  put chat, personal data, or arbitrary strings in replay values.
- Offline writes are kept in a local queue of at most 25 entries. Saves
  coalesce to the newest value, same-day scores to the highest value, and
  duplicate crashes to one entry. The queue is best effort and local-storage
  eviction can remove it.
- Sessions expire after 90 days. Schedule occasional D1 maintenance to delete
  expired sessions, consumed/expired score challenges, old duels, and old
  crash aggregates if desired.
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
node --check js/social.js
```

## Быстрый старт для GitHub Pages

1. Скопируй `wrangler.toml.example` → `wrangler.toml`, создай D1 и примени миграции.
2. `npx wrangler deploy` и скопируй URL Worker.
3. В игре: меню → **Облако** → вставь URL → **Сохранить URL** → **Подключить**.
   Либо пропиши URL в `<meta name="ottisk-cloud-api" content="...">` в `index.html`.
