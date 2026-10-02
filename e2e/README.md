# End-to-end tests

```bash
npm run test:e2e          # run
npm run test:e2e:ui       # interactive
npm run test:e2e:report   # last HTML report
```

## No database, no shared state

These tests touch nothing outside the app under test. Playwright starts a
dev server on port 3917, and every assertion is against HTTP responses or
rendered pages.

That is worth stating because it used to be very different. The suite ran
against the real Neon database: it created `e2e-*` admin accounts in a
global setup step, and the content-editing specs read a live content row,
wrote a test value over it, asserted, then restored it.

That was documented as a risk, and the risk materialised. A run that timed
out mid-test on cold compilation died after the write and before the
restore, leaving `E2E test heading 1786957887236` sitting in live site
content. It was only caught later by a manual comparison.

The app no longer has a database, so the hazard is gone rather than
mitigated. Nothing here needs a separate test database, and no spec can
leave residue behind.

## What is covered

| Spec | Covers |
|---|---|
| `public-site.spec.mjs` | Homepage renders with no console errors; robots.txt and the favicon route respond |
| `security.spec.mjs` | Hardening headers are present; CSP locks down objects, base URI, form actions and framing |
| `panel-integration.spec.mjs` | `/api/revalidate` rejects absent/wrong/malformed tokens and accepts the real one; every removed admin route returns 404; the homepage renders real copy with no panel configured; sitemap.xml never advertises localhost |

`REVALIDATE_SECRET` is read from the environment for the one test that
needs it, and that test skips rather than fails when it is unset — the
rejection cases already cover the security-critical half without needing
the secret.

## What is deliberately NOT covered here

Content editing, uploads, roles, login, backups and the activity log all
moved to the central admin panel along with the code that implemented them.
Those surfaces do not exist in this app any more, so their absence from
this suite is not a coverage gap. They should carry equivalent tests in the
panel's own repository — see `INTEGRATION.md` for the contract they need to
satisfy.
