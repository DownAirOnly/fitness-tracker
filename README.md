# Everyday fitness tracker

A small mobile-first web app for food, lifting, and body weight. The home screen has two primary actions. On the first visit after 6 a.m. local time each day, it offers a weigh-in with an **Enter later** option. A weigh-in already recorded for today suppresses the prompt.

## Run

Requires Node.js 20 or newer. No packages or accounts are needed.

```sh
npm run dev
```

Open http://127.0.0.1:4173. Run `npm test` for the data-model checks. To install as an iPhone Home Screen app, serve this folder over HTTPS, open it in Safari, and use Share → Add to Home Screen. The service worker caches the app for offline use after its first load.

## What is included

- Daily calorie and protein totals with editable goals (initially 1,600 calories and 130 g protein).
- Automatically saved food cards for repeat taps. Each log stores its own calorie/protein values so editing a card does not rewrite history.
- Dated CSV food import, preview and validation, dated edits, and a complete JSON backup/restore.
- Upper, lower, and full-body starter exercise lists, custom exercises, sets/reps/weight, difficulty, notes, and last-time reference.
- Weigh-ins, individual BMI, and Monday-start weekly average weight/BMI. Height starts at 68 inches and is editable.
- Google sign-in with private Firestore account storage, save status, conflict protection, and explicit migration from device logs. Signed-in records require an internet connection and stay only in memory on the device. Device-only mode remains available. See FIREBASE_SETUP.md before enabling cloud accounts. Export JSON regularly for an independent backup.

## CSV format

The header must include `date,name,calories,protein`; `quantity` is optional. Dates must be `YYYY-MM-DD`, and nutrition is **per serving**. Quotes and commas in names are supported. Import adds entries (including duplicate rows if imported twice) and creates saved cards for new names. Check the preview before confirming.

```csv
date,name,calories,protein,quantity
2026-09-25,Core Power Elite,230,42,1
2026-09-24,"Chicken, rice and vegetables",650,48,1
```

For a full-device migration, export JSON from Settings and restore it on the other device. JSON restore replaces all existing local data after a preview.

## Cloud account setup

Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md), publish [firestore.rules](firestore.rules), and verify the backend before deploying this branch.

## Apple Health weight Shortcut (v12)

This optional bridge keeps the GitHub Pages PWA as the primary app. It needs no
native build, Apple Developer subscription, Cloud Function, or additional host.
Apple Health is read only by the user's iPhone Shortcut, with Health permission.
See `health-shortcut.html` for the phone setup. Only latest-weight sync is supported;
body fat, historical backfill and Health deletion mirroring are out of scope.

Before enabling it, publish the complete `firestore.rules` in the Firebase console.
Existing main-state rules are unchanged. The additional paths are:

- `/users/{uid}/integrations/appleHealth`: owner-only connection token, processed
  timestamp and last result. This is separate from backups and the main state.
- `/weightBridges/{256-bit-random-token}`: owner UID and one bounded pending sample.
  Only a verified owner can create/read/delete it. Possession of the random URL
  permits replacing `sample` only; no unauthenticated get/list/create/delete,
  owner changes, or writes to fitness records are allowed. The PATCH response is
  masked to the submitted sample. Treat the URL as a bearer secret and never log
  or share it. Disconnect atomically deletes both connection and pending sample.

This is a narrowly scoped capability URL, not Apple/Firebase account authentication.
A leaked URL permits false weight submissions and consumes Firestore write quota;
revoke it with Disconnect and reconnect for a new URL. This is an opt-in personal
bridge, not a public ingestion service with server-side abuse/rate controls.
No administrator or Google credentials belong in Shortcuts.

`health-model.js` handles validation, local calendar dates, unit conversion and the
same-day policy independently of Shortcuts. `health-cloud.js` uses a transaction
that reads the current state revision and pending sample and atomically saves both
an imported weight and its processed timestamp. Failed/conflicting writes do not
partially acknowledge or import data. The app applies returned data only to the
session that initiated the operation. It does not sync while a form is open or
there are pending edits. Foreground checks are throttled to 30 seconds; Settings
has an explicit check button. The phone Shortcut sends the sample; the PWA then
imports it on next check, not while closed in the background.

Existing manual same-day entries win. Newer imported same-day entries update prior
imported entries. Manual editing removes imported provenance so sync cannot replace
the edit. Repeated/older readings at or before the processed timestamp are ignored,
including after deletion or restoring a backup. Disconnecting resets that watermark.
Exported weights retain their source/timestamp; secrets stay out of exports.

Verification: `node --test tests/health.test.js`, `npm run test:ui`, and
`npm run test:rules` (requires Java 21+). The rules test exercises the exact anonymous
Firestore REST PATCH request that Shortcuts sends as well as cross-user isolation,
invalid payload rejection and revocation. A real-iPhone end-to-end test must follow
rules publication and Shortcut setup; desktop tests cannot grant Health permissions.
