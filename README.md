# Everyday fitness tracker

A small mobile-first web app for food, lifting, and body weight. The home screen has two primary actions. On the first visit after 6 a.m. local time each day, it offers a weigh-in with an **Enter later** option. A weigh-in already recorded for today suppresses the prompt.

## Run

Requires Node.js 20 or newer. No packages or accounts are needed.

```sh
npm run dev
```

Open http://127.0.0.1:4173. Run `npm test` for the data-model checks. To install as an iPhone Home Screen app, serve this folder over HTTPS, open it in Safari, and use Share → Add to Home Screen. The service worker caches the app for offline use after its first load. The app requests persistent origin storage when supported and shows the granted/best-effort status in Settings → Offline protection.

## What is included

- Daily calorie and protein totals with editable goals (initially 1,600 calories and 130 g protein).
- Saved Food cards open a prefilled food-log form for fast quantity/date/time changes, with a five-second Undo after saving. Each log stores its own calorie/protein values so editing a saved definition does not rewrite history.
- Universal additive CSV import from files or pasted text, with preview and validation, plus pasted/file JSON backup restore.
- Upper, lower, and full-body starter exercise lists, custom exercises, sets/reps/weight, difficulty, notes, and last-time reference.
- Weigh-ins with optional body-fat percentage, individual BMI, weight/body-fat charts, and Friday-start weekly average weight/BMI. Height starts at 68 inches and is editable.
- Google sign-in with private Firestore account storage, save status, conflict protection, and explicit migration from device logs. While signed in, the app also keeps an account-scoped last-confirmed device copy plus an unsaved recovery copy so an iOS process refresh or temporary network loss does not depend on RAM. Conflicting cloud/device revisions are never overwritten automatically. Explicit sign-out clears those account-specific local copies. Device-only mode remains available. See FIREBASE_SETUP.md before enabling cloud accounts. Export JSON regularly for an independent backup.

## CSV format

CSV is an additive interchange format for normal user-editable Everyday data. It can be uploaded as a file or pasted directly into More → Import & backup → Import data. Every CSV goes through the same preview before it can be committed.

For new universal CSVs, include a `recordType` column. One CSV may mix record types. Blank columns are allowed when they do not apply to that row.

Supported record types:

| recordType | Main fields |
| --- | --- |
| `savedFood` | `name,calories,protein,kind,tags,favorite,accuracy,lastUsed` |
| `foodLog` | `date,name,calories,protein,quantity,time` |
| `exercise` | `exercise,equipment,setup` |
| `workout` | `workout,exercise,equipment,order,repMin,repMax,targetSets,restSeconds` |
| `lift` | `date,exercise,equipment,group,set,weight,reps,effort,notes` |
| `weight` | `date,weight,bodyFatPercent` |

Workout rows with the same `workout` name are assembled into one template and ordered by `order`. Lift rows with the same `group` are assembled into one lift entry with multiple sets. Dates use `YYYY-MM-DD`. Food time may be a half-hour slot number (0–47) or `HH:MM` on a 30-minute boundary. Tags may be separated by `|` or `;`.

Example mixed CSV:

```csv
recordType,date,name,calories,protein,quantity,exercise,equipment,workout,order,repMin,repMax,targetSets,restSeconds,group,set,weight,reps,effort,notes,bodyFatPercent,kind,tags,favorite,accuracy
savedFood,,Core Power Elite 42g,230,42,,,,,,,,,,,,,,,,,food,protein|drink,true,label
foodLog,2026-10-02,Core Power Elite 42g,230,42,1,,,,,,,,,,,,,,,,,,,
exercise,,,,,,Chest Press,machine,,,,,,,,,,,,,,,,
workout,,,,,,Chest Press,machine,Upper,1,6,12,2,90,,,,,,,,,,,
lift,2026-10-02,,,,,Chest Press,machine,,,,,,,upper-press,1,60,10,4,,,,,
lift,2026-10-02,,,,,Chest Press,machine,,,,,,,upper-press,2,60,8,5,,,,,
weight,2026-10-02,,,,,,,,,,,,,,,181.5,,,,22.4,,,,
```

The original food-only CSV format remains supported for compatibility:

```csv
date,name,calories,protein,quantity
2026-09-25,Core Power Elite,230,42,1
2026-09-24,"Chicken, rice and vegetables",650,48,1
```

CSV imports add or deliberately update the referenced user-facing definitions; they do not import internal active Workout Buddy recovery state. JSON remains the complete backup format. JSON restore replaces the current dataset only after the preview.

## Cloud account setup

Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md), publish [firestore.rules](firestore.rules), and verify the backend before deploying this branch.

## Apple Health weight + body-fat Shortcut

This optional bridge keeps the GitHub Pages PWA as the primary app. It needs no native build, Apple Developer subscription, Cloud Function, or additional host. Apple Health is read only by the user's iPhone Shortcut, with Health permission. See `health-shortcut.html` for the phone setup.

The Shortcut submits the latest weight and can include a same-day Body Fat Percentage sample. Everyday stores body fat on that day's weigh-in. The bridge accepts either Health-style fractional values such as `0.224` or display-style `22.4` and stores `22.4%`. Body fat is rejected if its timestamp does not match the weight's calendar day, which prevents stale composition data from being paired with a newer weight.

Before enabling it, publish the complete `firestore.rules` in the Firebase console. The additional paths are:

- `/users/{uid}/integrations/appleHealth`: owner-only connection token, processed weight/body-fat timestamps, and last result. Secrets stay outside backups.
- `/weightBridges/{256-bit-random-token}`: owner UID and one bounded pending sample. Possession of the random URL permits replacing `sample` only; it does not permit reading fitness records or changing the owner.

Treat the Shortcut URL as a bearer secret. Disconnect revokes it and creates a new token on reconnect. No administrator or Google credentials belong in Shortcuts.

`health-model.js` validates dates, units, values, same-day body-fat pairing, unit conversion, and conflict policy independently of Shortcuts. Existing manual same-day weight remains authoritative, while fresh same-day body fat can enrich that manual weigh-in. Newer synced weight can replace an older synced weight. Weight and body-fat processed timestamps are tracked independently so repeated/older samples are ignored without blocking a fresh measurement.

`health-cloud.js` imports measurements and acknowledges their processed timestamps in a Firestore transaction. Failed or conflicting writes do not partially acknowledge data. Historical Health backfill and Health deletion mirroring remain out of scope.

Verification targets are `npm test`, `npm run test:ui`, and `npm run test:rules` (Java 21+ for the Firestore emulator). A real-iPhone end-to-end check is still required after publishing the updated rules and editing the Shortcut because desktop tests cannot grant Health permissions.
