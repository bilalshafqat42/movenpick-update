# Connecting Movenpick to a central admin panel

Movenpick is a Next.js landing page that can take all of its editable text
and images from an external, multi-site admin panel over HTTPS. This
document is the contract: build these three endpoints and Movenpick will
attach to your panel by setting environment variables, with no code
change on this side.

Written for whoever builds the admin panel. Everything here is already
implemented and tested on the Movenpick side.

---

## 1. How it fits together

```
┌────────────────────────┐                    ┌──────────────────────┐
│  Central admin panel   │                    │  Movenpick landing page │
│  (multi-site, owns DB) │                    │  (no database)       │
│                        │                    │                      │
│  GET  /api/content ────┼───── content ─────>│  renders pages       │
│  POST /api/leads/intake│<──── enquiries ────┼── contact + chat     │
│                        │                    │                      │
│  after an editor saves ├──── "refresh" ────>│  POST /api/revalidate│
└────────────────────────┘                    └──────────────────────┘
```

Movenpick holds no database credentials. That is the point of the split: if
the landing page were fully compromised, there is nothing on it to reach
your database, your admin accounts, or any other site's content.

**Movenpick never breaks when the panel is unavailable.** Every field has a
built-in default equal to the copy the site shipped with. If the panel is
down, unreachable, or returns an error, the page still renders that copy.
This is verified by test, and it is the reason this dependency is safe.

---

## 2. What you must build

Two endpoints on the panel, and one call out to Movenpick.

### 2.1 `GET /api/content` — required

Returns all editable content for one site.

**Request Movenpick sends:**

```http
GET /api/content?site=movenpick
Authorization: Bearer <that site's token>
```

**Response Movenpick expects (HTTP 200):**

```json
{
  "sections": {
    "hero": [
      { "key": "heading", "type": "TEXT",  "value": "Life Shaped By Sea And Serenity.", "imageUrl": null },
      { "key": "main-image", "type": "IMAGE", "value": null, "imageUrl": "https://cdn.example.com/hero.avif" }
    ],
    "footer": [
      { "key": "phone-display", "type": "TEXT", "value": "+971 4 330 0299", "imageUrl": null }
    ]
  }
}
```

Rules:

- Top-level key is `sections`. Each key under it is a **section slug**;
  each value is an array of rows.
- A row is `{ key, type, value, imageUrl }`.
- For `type: "IMAGE"`, put the URL in `imageUrl` and leave `value` null.
  For every other type, use `value`.
- **Return only the fields an editor has actually changed.** Omitted keys
  and omitted sections fall back to Movenpick's built-in defaults, which is
  the desired behaviour, not a gap to fill. Do not send empty strings for
  untouched fields; an empty string is a real value and will render as
  blank.
- Send `Cache-Control: no-store`. Movenpick does its own caching and
  invalidation; a third cached copy in between turns "why is my edit not
  showing" into a three-way debugging problem.

Valid `type` values: `TEXT`, `RICHTEXT`, `IMAGE`, `LINK`, `BOOLEAN`.
`BOOLEAN` is sent as the string `"true"` or `"false"`, not a JSON boolean.

#### You do not have to match this shape exactly

Movenpick normalises the response, so all of the following work identically.
This exists because a shape mismatch otherwise produces a site that silently
renders its built-in defaults, which looks exactly like "not connected yet"
and has no error to follow.

Envelopes — `sections`, `data`, `content`, or none:

```json
{ "sections": { "hero": ... } }
{ "data":     { "hero": ... } }
{ "content":  { "hero": ... } }
{ "hero": ... }
```

Per-section — array of rows, plain key/value object, or a `fields` wrapper:

```json
"hero": [ { "key": "heading", "type": "TEXT", "value": "Hi" } ]
"hero": [ { "key": "heading", "value": "Hi" } ]
"hero": [ { "name": "heading", "value": "Hi" } ]
"hero": { "heading": "Hi" }
"hero": { "fields": [ { "key": "heading", "value": "Hi" } ] }
```

Images are detected either way: an explicit `type: "IMAGE"`, an `imageUrl`
field, or a value that simply looks like an image path or URL.

Booleans and numbers are accepted as JSON primitives and stringified, so a
real `false` is preserved rather than dropped.

If Movenpick authenticates and parses successfully but finds nothing usable, it
logs `Content API returned no usable sections` and falls back to defaults —
so an unrecognised shape is visible in the logs rather than silent.

#### Authentication header

Movenpick sends the token **both** ways on every request:

```http
Authorization: Bearer <token>
x-api-key: <token>
```

Read whichever you prefer. Both are sent because which one the panel expects
is not observable from outside, and a wrong guess produces a 401 that is
indistinguishable from a wrong token.

### 2.2 `POST /api/leads/intake` — required if you want enquiries stored

Receives a contact-form, chat, or viewing-booking submission.

**Request Movenpick sends:**

```http
POST /api/leads/intake
Authorization: Bearer <that site's token>
Content-Type: application/json
x-oceara-client-ip: 203.0.113.42

{
  "site": "movenpick",
  "source": "contact",
  "body": { "firstName": "...", "email": "...", "phone": "...", "...": "the full raw submission" }
}
```

- `source` is one of `contact`, `chat`, or `slot` (`slot` is a viewing
  booking). Store submissions against the site in `site`, or the sales
  team cannot tell which property a caller is asking about.
- `body` is the raw submission, passed through untouched.

**The three forms send DIFFERENT field names for the same data.** This is
the single most likely thing to go wrong on your side, because it fails
silently: the enquiry saves, and the name column is just empty. Both shapes
are verified below from real submissions.

The **contact form** (`source: "contact"`) uses camelCase:

```json
{
  "firstName": "...", "lastName": "...", "userType": "...",
  "phone": "+971...", "email": "...",
  "utm_source": "...", "utm_medium": "...", "utm_campaign": "...",
  "page_url": "...", "gclid": "...", "fbclid": "...", "msclkid": "..."
}
```

The **chat widget** (`source: "chat"`) uses snake_case, and carries the
qualification answers, which are the commercially interesting part:

```json
{
  "first_name": "...", "last_name": "...",
  "phone": "+971...", "email": "...", "company": "",
  "intent": "buyer", "search_stage": "actively_looking",
  "unit_type": "studio", "budget_bracket": "500k_1m",
  "project": "[Movenpick Project Name]",
  "source": "Movenpick Website Chatbot", "language": "en",
  "consent": true, "pageUrl": "...", "submittedAt": "ISO-8601"
}
```

So read `body.firstName ?? body.first_name` (and the same for last name)
rather than either alone. Store the whole object regardless, so nothing is
lost when a form gains a field.

Note the chat also sends `consent: true`, the visitor's explicit agreement
to be contacted. Keep it: under UAE PDPL that record is the evidence that
consent was given, and it is per-submission rather than per-person.

**Response Movenpick expects:**

| Status | Meaning | What Movenpick does |
|---|---|---|
| `200` with `{"saved": true}` | Stored | Tells the visitor it succeeded |
| `429` with `Retry-After` | Rate limited | Shows "too many submissions, try again shortly" |
| anything else | Failed | Falls back to its own Zapier forward; only shows the visitor an error if that also fails |

**Three things worth getting right here:**

1. **Rate limit on `x-oceara-client-ip`, not on the caller's IP.** Every
   lead reaches you from Movenpick's single server address. Keying on that
   puts every visitor on earth in one bucket, so a handful of submissions
   from anywhere would block the contact form for everybody. Trusting that
   header is safe *only because* you reject unauthenticated requests
   first.
2. **Keep the two budgets separate.** Movenpick counts viewing bookings
   (`slot`) against a different allowance from contact and chat
   submissions, so a visitor who just sent an enquiry is not blocked from
   booking a viewing.
3. **Never log the `body`.** It contains real names, emails, and phone
   numbers. Under UAE PDPL that is exactly the incidental copy to avoid,
   and note that ORM errors often pretty-print the full query arguments
   into the log by default.

### 2.3 Calling Movenpick's `POST /api/revalidate` — required for instant edits

Movenpick caches content, so after an editor saves you must tell it to
refresh. Fire and forget:

```http
POST https://movenpick.ae/api/revalidate
Authorization: Bearer <the revalidate secret for this site>
```

Store the webhook URL and its secret **per site**, alongside that site's
content. Returns `200 {"revalidated": true}`.

If you skip this, edits still appear, but only after Movenpick's cache window
expires (default 300 seconds). If the call fails, do **not** report the
save as failed to the editor: the content is already stored, and a retry
would write it twice.

---

## 2.4 Image uploads — please read this one

Movenpick does **not** resize or re-compress images. On-demand optimisation is
switched off, because the Render instance it runs on returned 502 at three
concurrent optimisation requests. So **whatever the panel stores is exactly
what every visitor downloads**, at full size.

That makes upload handling the panel's responsibility, and it is the easiest
way to quietly ruin this site's performance: one editor uploading a 6 MB
camera JPEG means a 6 MB download for every visitor, on mobile, with nothing
in Movenpick able to prevent it.

For reference, the committed images were compressed to a **248 KB median and
596 KB maximum**, and the whole folder went from 40.6 MB to 7.9 MB. Uploads
should land in that range.

Recommended on upload:

| Control | Value | Why |
|---|---|---|
| Max longest edge | **2400px** | Movenpick displays at most 1920px |
| Re-encode | AVIF q75, or WebP q80 | ~250 KB for a 2000px photo |
| Reject over | **5 MB** before processing | The previous built-in panel's limit |
| Verify type | Magic bytes, not the declared MIME | A declared type is attacker-controlled |
| Reject | SVG | It can carry script |

**Also set `IMAGE_HOSTS`** on the Movenpick service to whatever host serves your
uploads, before any editor uploads anything. Movenpick's Content-Security-Policy
blocks images from unlisted hosts, and that failure is entirely client-side:
the server logs nothing, the HTML is correct, and the only symptom is a broken
image in the visitor's browser.

Movenpick does degrade gracefully if an image URL fails for any reason — a
deleted file, an unreachable host, a CSP block — by falling back to the
committed default for that field. That is a safety net, not a substitute for
getting the above right: the visitor then sees the original stock photograph
rather than the one the editor chose.

## 3. Security requirements

**Issue each site its own token, and scope it server-side to that site.**

This is the one thing not to get wrong. If a single shared token can read
any site by changing `?site=`, then one leaked landing-page token exposes
every client's content, including unlaunched sites. The site key
identifies; the token authorises. Never derive access from the site key
alone.

Also:

- Compare tokens in constant time, and reject a missing configured token
  rather than treating `Bearer undefined` as valid.
- The content endpoint must return content and nothing else. The same
  database holds password hashes and customer enquiries; a convenience
  parameter that widens what can be selected quietly removes the whole
  benefit of separating the landing page out.
- These endpoints are called server-to-server and are legitimately
  cross-origin, so `Origin` and `Sec-Fetch-Site` carry no useful signal.
  The token does the work.

---

## 4. What Movenpick's content actually is

Two files in this repo give you everything you need:

- [`content-schema.json`](./content-schema.json) — the machine-readable
  content **model**: 16 sections, 131 fields, each with its slug, label,
  type, permission level, and default value. Import it to create Movenpick in
  your panel rather than typing 131 fields in by hand.
- [`content-export.json`](./content-export.json) — a snapshot of Movenpick's
  live content **values**, taken from its own database on 17 August 2026
  immediately before that database was retired. Same wire shape as
  `GET /api/content`, so it can be loaded directly. Import it so editors
  see the real current site rather than starting from defaults.

Regenerate it after any field change with:

```bash
npm run schema:export
```

It is generated from `src/content/sections/` (the source of truth on this
side) and is deterministic, so a re-run with no changes produces no diff.
Seed your panel with the `defaultValue`s so an editor's first view shows
the real site rather than blank inputs.

Section slugs, for orientation:

| Group | Slugs |
|---|---|
| Header | `navigation`, `appearance` |
| Content | `hero`, `about`, `amenities`, `location`, `project`, `gallery`, `contact`, `seaSection`, `payment`, `footer`, `chatAgent` |
| SEO | `seo`, `robots`, `sitemap` |

Two notes:

- `sitemap` has no editable fields. It is generated from real data and
  exists only to offer a link to the live file.
- `minRole` in the schema records Movenpick's current permission boundary:
  brand assets, SEO, and robots.txt are Admin-only; page copy is
  Editor-editable. Carry it across if your panel has roles.

Gallery and Amenities have a **fixed item count**. Content per item is
editable, but items cannot be added or removed, because the carousel's
index arithmetic depends on a stable count. Do not offer an "add item"
control for those two.

---

## 5. Attaching Movenpick once your panel is live

Set these on the Movenpick service. No deploy or code change needed.

| Variable | Value |
|---|---|
| `CONTENT_API_URL` | Your panel's base URL, e.g. `https://admin.refinedubai.com` |
| `LEAD_API_URL` | Same base URL |
| `CONTENT_API_TOKEN` | The token you issued for Movenpick |
| `LEAD_INTAKE_TOKEN` | The token you issued for Movenpick |
| `SITE_KEY` | `movenpick` |
| `SITE_URL` | `https://movenpick.ae` (required in production) |
| `CONTENT_CACHE_SECONDS` | `300` (must not be `0`) |
| `IMAGE_HOSTS` | Host serving your uploaded images, e.g. `cdn.refinedubai.com` |

And store on your side, against the Movenpick site record:

| Setting | Value |
|---|---|
| Revalidate webhook URL | `https://movenpick.ae/api/revalidate` |
| Revalidate secret | Must match Movenpick's `REVALIDATE_SECRET` |

#### When content is fetched, which is not obvious

Movenpick's homepage is **prerendered**, so content is fetched:

1. **At build time.** `CONTENT_API_URL` must be set on the Render service
   *before* the build runs, which it is when set as an environment variable.
   Verified: the panel receives exactly one request during a build.
2. **When the revalidation webhook fires** (below), or when
   `CONTENT_CACHE_SECONDS` elapses.

The practical consequence: after an editor saves, the page keeps serving what
it last built until something invalidates it. That is what the webhook is for.
Without it, edits appear only after the cache window (default 300s).

**To detach**, clear `CONTENT_API_URL`. Movenpick reverts to its committed
content defaults. The switch is reversible in both directions with no code
change or redeploy either way, which is what makes the cutover low-risk.

---

## 6. Suggested order for the cutover

1. Build `GET /api/content`. Return `{"sections":{}}` at first — Movenpick
   renders its defaults, so you can wire up auth before any content
   exists.
2. Import `content-schema.json` and seed Movenpick's sections and defaults.
3. Set `CONTENT_API_URL` and the tokens on Movenpick. Confirm an edit in your
   panel appears on the site after you call the revalidate webhook.
4. Wire the webhook into your save handler so it fires automatically.
5. Build `POST /api/leads/intake`, then set `LEAD_API_URL` on Movenpick.
   Submit a real test enquiry and confirm it lands.
Movenpick's own built-in admin panel, database, and Blob storage have
**already been removed**, so there is no step 6 and nothing left to clean
up on this side. Until step 3 is done the site serves its committed content
defaults, which are the copy currently live — a complete, correct page that
simply cannot be edited yet.

One thing that is easy to miss until it bites: set `IMAGE_HOSTS` on the
Movenpick service to whatever host your panel serves uploaded images from,
**before** editors start replacing images. Next.js refuses to load an image
from a host it has not been told about, and it fails abruptly rather than
gracefully. Nothing warns beforehand, because every image default is a
local path, so the site looks perfect right up to the first upload. It is
read at build time, so it needs a rebuild rather than a restart.
