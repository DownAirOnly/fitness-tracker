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
