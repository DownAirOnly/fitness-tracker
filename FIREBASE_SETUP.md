# Enable private cloud accounts

Project: `everyday-fitness-cbf4a`. The app remains hosted on GitHub Pages.

1. In Firebase Console → Authentication → Get started → Sign-in method, enable **Google**, choose your support email, and Save.
2. Authentication → Settings → Authorized domains: add **downaironly.github.io** (no scheme or path).
3. Build → Firestore Database → Create database: choose **Standard edition**, database ID `(default)`, an appropriate US region, and **production mode**. Stay on Spark/no billing. Never choose test mode for real fitness data.
4. Firestore Database → Rules: replace the editor with the complete contents of `firestore.rules`, then Publish.
5. Test the rules and sign-in before merging the cloud-account branch. Use two distinct Google accounts: each must see its own empty/new or previously saved state, with other users' reads and writes denied.

The web configuration is public. It cannot publish security rules or enable authentication providers. Never paste a service account private key into the app or the public repository.

## Storage and behavior

`users/{Firebase UID}/state/main` contains a versioned JSON snapshot. Rules require the authenticated, verified owner and a revision increment of exactly one. Signed-out users cannot read anything; collection listing and direct deletion are denied.

Cloud fitness records stay in memory, not persistent browser cache. Sign-in credentials persist until sign-out. Cloud use requires internet. Save errors are shown as unsaved, with retry/export/load-latest actions. A transaction refuses to overwrite a newer revision from another device. Refresh from cloud before working on another device; stale edits produce a visible conflict instead of replacing newer data.

Existing local data is never automatically uploaded. In More, a signed-in user can choose **Copy device logs to this account** and confirm the destination email. Repeated migration deduplicates IDs, preserves cloud weigh-ins for the same date, and converts incoming units. The original device copy is retained. JSON restore is an explicit replacement and has a confirmation preview.

Current snapshot limit: 800,000 UTF-8 bytes per account (below Firestore's document limit). Larger imports fail before writing and can be exported. A future per-entry schema can lift this limit without changing the sign-in provider.

## Verification

`npm test` runs data and cloud-model tests with an injected store. These verify failure recovery and revision checks; they do not replace Firestore rule tests or live Google login testing.

Use Node.js 22 or newer and Java 21 or newer. Run `npm ci`, `npm test`, `npm run test:ui`, and `npm run test:rules`. The UI test uses simulated authentication; the rules test uses the Firestore emulator. No real Firebase data is used. A successful live Google sign-in still needs to be checked after console setup.
