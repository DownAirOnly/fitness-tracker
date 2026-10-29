# Everyday — project context and conversation handoff

> **Read this file first in every new Everyday development conversation.** This is the living project handoff, not an implementation spec or a substitute for inspecting code. Check `version.json` and recent commits to confirm the current release before editing. Update this document when completing each version and before moving to a new conversation.

## Snapshot

- **App:** Everyday — mobile-first personal fitness, food, workout, measurement, and finance tracker.
- **Repository:** `DownAirOnly/fitness-tracker`, default branch `main`.
- **Published PWA:** https://downaironly.github.io/fitness-tracker/ (iPhone Home Screen usage matters).
- **Source of truth:** `version.json`, the corresponding `main` commit, and GitHub Pages deployment. Version in this handoff must be reconciled with those.
- **Latest implemented release covered here:** **v98**, Budget and native iOS packaging groundwork. Verify CI and Pages after merge; the native app is not yet compiled or signed.
- **Conversation cadence:** New ChatGPT conversation after each **five-number release cycle**. Completed scope: **v91–v95** (Fitness Workless 6). **Next cycle: v96–v100**, suggested title **Fitness Workless 7**. These are release boundaries, not an already approved roadmap.
- **Important:** The version number is the app release, not the conversation number. Small fixes within a version need not force a new conversation; keep handoff accurate.

## What to do at the beginning of the next conversation

1. Read this **`PROJECT_CONTEXT.md`** in the connected GitHub repository first.
2. Check `version.json`, 3–5 latest commits, open PRs and relevant workflow status to verify what is *actually* shipped.
3. Read only the code and tests needed for the next requested task. Avoid reconstructing all former conversations or rereading the full README unless useful.
4. Resume from **Outstanding work** below, respecting what is **completed**, **unverified**, and **proposed**, and respond to the user's new priorities.
5. Never ask the user to upload GitHub code already accessible via the connected account. Ask for a device screenshot only if needed for real-iPhone behavioral verification.

## Architectural map

| File/path | Main responsibility |
|---|---|
| `app.js` | App UI, navigation, delegated events, modal flows, logging, local/cloud state orchestration |
| `data.js`, `storage-model.js` | Notebook normalization, local persistence, food/weight/lift core data, backup format |
| `finance-model.js` | Financial transaction fields, integer cents, basic financial import helpers |
| `bank-import.js` | Bank of America CSV parsing, date-range labels, bank-stable IDs, enrichment CSV handling |
| `import-model.js` | Preview-first reviewed imports, in-place transaction enrichment, duplicate detection |
| `cloud.js`, `cloud-model.js`, `durability.js`, `firestore.rules` | Google sign-in/Firestore, revision protection, local recovery, persistence |
| `health-model.js`, `health-cloud.js` | Optional Apple Health Shortcut bridge and measurement sync |
| `muscle-map.js` | Workout anatomy highlight SVG logic |
| `styles.css`, `theme.js`, `index.html` | Responsive UI, visual styles and app shell |
| `sw.js`, `version.json` | Offline caching, background updates and published version |
| `tests/*.test.js`, `tests/ui-smoke.mjs` | Node model/regression tests and jsdom UI smoke tests |
| `README.md` | Detailed historical release notes and full feature explanations |
| **`PROJECT_CONTEXT.md`** | Current project status, decisions, outstanding work and next-conversation handoff |

## Release history — current and preceding cycle

| Version | Delivered scope / notes |
|---|---|
| v81 | Five-tab navigation including Finance; Settings moved to top gear |
| v82 | Validated financial transactions stored across local, cloud, JSON backups, and migration |
| v83 | Quick Finance logging, recent entries and reviewed prepared transaction CSV |
| v84 | Direct BofA CSV adapter, immutable original source fields, ChatGPT enrichment round-trip |
| v85 | Editable transaction classification independent from immutable bank debit/credit |
| v86 | Exclude three $0 canceled bank notices; regression scenario with 478 real rows |
| v87 | Infer editable statement/batch labels from actual CSV dates |
| v88 | Detect explicit debt payments/overdraft credits as transfers, warn on ambiguous P2P and similar duplicates |
| v89 | Stop silent rejection of ordinary log submissions when cloud save is pending after iOS app switching; concise Finance rows |
| v90 | Full transaction history: searchable ledger, type/month/category filters, sorting, 50-row pagination and editing; browsing read-only |
| v91 | Finance classification review queue: shortcut and review filters for uncategorized records and possible bank transfer mismatches; no automatic changes |
| v92 | Workout Buddy set progression: later sets inherit the latest completed set from the active workout; undo buttons appear only during corresponding transitions |
| v93 | Workout Buddy no-scroll set layout: compact first/second set views, anchored anatomy and primary action, overlay history and fallback on constrained screens |
| v94 | iPhone Workout Buddy input fixes: same-tap Setup/Notes focus, 16px text-input minimum, visual viewport keyboard fitting and layout restoration |
| v95 | Stabilization: interrupted Setup edits preserved as cancelable drafts, version/cache consistency test, and complete v96–v100 handoff |
| v96 | Finance classification: persisted, review-only merchant rules, targeted ChatGPT CSV corrections with expected-value conflict protection, selectable field-diff preview, Finances/Progress navigation swap |
| v97 | Read-only Finance Spending Insights |
| **v98** | Budget forecast, recurring paydays/bills, category limits, manual balance and what-if; Capacitor scaffolding (not signed) |

The README includes granular older Workout Buddy and fitness feature versions; consult it only as needed.

## Finance: known test and user state

- A privately supplied BofA statement covering **Aug 3 – Oct 27, 2026** reconciled exactly: **478 monetary rows, 442 debits, 36 credits**, and **3 canceled $0 notices** excluded; the display label is `Aug 3 – Oct 27, 2026`.
- The user's **real iPhone preview** of the same export showed **0 bank transactions to import** and the Finance screen showed **478 total**. This confirms those transactions were already in the notebook and matched stable import IDs; it is **not** proof that all spending categories are accurate.
- At v88 import time, 61 bank rows were initially recognized as transfers; 25 person-to-person entries were flagged for human review. These are import-classification results, not verified statements of spending purpose.
- A separate **nine-row enrichment CSV** was prepared and simulated for **six scheduled/debt payments** and **three overdraft-protection credits** in the user's already imported notebook. Expected correction: expense/income to `transfer`, category `Transfers`, subcategories `Debt payments` / `Overdraft protection`. The correction produced 9 updates/0 errors in a simulated old ledger; it was supplied to the user, but **user application is not confirmed**. **Do not claim it has been applied.**
- **Enrichment CSV** updates existing stable transaction IDs in place; do not reimport 478 transactions to change classifications. Bank-sourced facts (`bankDescription`, posted date, original debit/credit, amount) must remain immutable. Never silently overwrite personalized descriptions, receipts or notes.
- A transaction's **posted date** is not necessarily the physical purchase date. Store receipt time/date separately if known.
- The user's preferred compact row hierarchy: **small gray posted date at upper left**, personal title, a quiet original bank description only if different, and any meaningful category/subcategory immediately after; hide `Uncategorized`, BofA account label and statement range from the compact list (preserve metadata in editor/records).
- Different bank accounts may have identical transactions; ambiguous possible duplicates should be flagged, **not** silently merged. Identity is stable across statement-label changes but may require review if account labels change.

## Known behavior requiring verification

- **v89 iOS app-switch issue:** the user reported that after switching away and back, navigation still worked but forms (food/CSV/finance etc.) could become unresponsive. The prior code silently rejected all form submissions while `cloudBusy` or `cloudPending`; v89 removed this block for ordinary logging and preserved the local recovery path, while imports still require stable cloud state with a visible warning. CI and smoke tests passed. **Real iPhone app-switch/return verification has not yet been reported.** If issue persists, investigate iOS WebKit suspension, auth/session reload and pending cloud operations; preserve logs and never throw away recovery data.
- **v90 full history:** verify deployed version, filters, data count, responsive scroll, and edit-from-history behavior on iPhone. Browser-only automated tests do not verify WebKit.
- **Existing classification correction:** the nine-row enrichment file was supplied and simulation-validated, but **not confirmed saved by the user**.

## v91 release scope and verification

- **Delivered in code:** Finances shows Review classifications when saved records need attention. History adds Needs review, Uncategorized, and Possible transfers filters plus small review reason labels. Existing filters and individual editing remain available.
- **Inference limits:** Transfer hints reuse existing bank import rules for explicit debt payments, overdraft credits and transfers; no P2P or manual transaction is presumed a transfer. Review flags do not automatically change any saved data.
- **Coverage:** Added tests/finance-review.test.js and UI smoke checks for queue navigation, filtering and unchanged ledger data. Verify CI, merge and deployment independently. Browser tests are not proof of real iPhone behavior.
- **Still open:** v89 iPhone background/foreground saving, v90/v91 History on-device checks and confirmation of the nine-row enrichment correction. Previously imported 478 transactions were not reimported or modified by v91.

## v92 release scope and checks

- **Implemented:** `buddy-set-model.js` is a pure helper for next-set defaults and scoped undo eligibility. Current workout's last completed set takes priority over last workout's corresponding set. Existing editing and persistence remain unchanged.
- **Undo:** undo applies only to the matching current state, and Back to exercises discards stale undo context. Start/finish/next-set and exercise transition undo remain supported.
- **Tests:** `tests/buddy-set-flow.test.js` covers first, second, and third set progression, edited set propagation, and undo state transitions. UI smoke covers a live demo sequence, including edited first set > active second set and undo. Check CI and Pages before reporting live.
- **Deferred by planned release:** v93 no-scroll iPhone Workout Buddy layout; v94 focus and iOS keyboard zoom; v95 stabilization and v96–v100 handoff. The anatomy art redesign remains unapproved and separate.
- **Outstanding earlier verification:** v89 app switching/save, v90/v91 Finance History on iPhone, nine-row enrichment application. No user notebook edits are performed by this release.

## v93 release scope and verification

- **Implemented:** Normal Workout Buddy set screens now attempt to fit the iPhone display without inner-page scrolling; title, anatomy, history, rest, completed-set summary, inputs, effort, notes and action use compact spacing. The anatomy graphic remains anchored at one top position for ready, review and active set states.
- **Expanded history:** Previously logged workout details open in an independent dropdown overlay that does not push the set controls down. The main exercise screen is not scrollable when its full content fits.
- **Accessibility fallback:** A measured content-height check enables scrolling only when essential controls would otherwise be clipped. Exercise picker, full journal and guide screens keep intended independent scrollability. This fallback does not disable user zoom.
- **Coverage:** UI smoke tests verify viewport overflow fallback and expanded-history access in synthetic demo. DOM smoke tests cannot establish real iPhone/WebKit geometry; **user on-device confirmation remains required**.
- **Still to do:** v94 automatically focus Setup and prevent unnecessary iOS form zoom; v95 stability checks and handoff to v96–v100. The nine-row finance correction, iOS background save and v90/v91 review verification are not silently treated as complete. No financial data or past workout logs are mutated by the UI change.

## v94 release scope and verification

- **Input and keyboard:** Setup opens and focuses/selects the text input before any asynchronous persistence. Notes also focuses before persistence. Pressing Return on Setup continues to save.
- **iPhone layout:** Focused Buddy input uses `visualViewport.height` and `offsetTop` on its fixed screen while the keyboard is active. Existing v93 contained overflow fallback exposes editing controls, then normal full-height fit is restored after blur/save. Setup, Notes and archived workout text entry use a 16px font minimum to avoid auto zoom; do **not** disable user pinch zoom.
- **Testing:** Expanded UI smoke covers immediate Setup/Notes focus, edited value retention, simulated shrunken visual viewport and restoration. This is not proof of real iOS keyboard behavior; device confirmation remains open.
- **No migrations:** Data model, cloud recovery, bank stable IDs and prior workout/financial records remain unchanged.
- **Next scope:** v95 stabilization and v96–v100 handoff, including any iPhone-reported regression from v92–v94. Previous v89 background saving, v90/v91 Finance history verification and nine-row BofA correction application remain unconfirmed, not silently resolved.

## v95 release scope and verification

- **Fix:** When a Workout Buddy Setup editor has uncommitted text, typing saves it as `setupDraft` on the active session in the existing device recovery path. Hiding the app, navigating away via pagehide or exiting the session captures the draft. Reopening the session shows the draft, whereas closing the Setup editor without pressing Save discards it. Only Save changes `e.setup` and the saved exercise definition. This does not rewrite completed workouts or the bank ledger.
- **Tests:** `tests/ui-smoke.mjs` now asserts draft capture after a simulated app interruption, stored definition remains untouched, re-entry restores text, and cancel discards it. `tests/release-integrity.test.js` requires the HTML, service worker, offline precache, import URLs and `version.json` to agree; pinch zoom must remain enabled. The release-integrity check caught a preexisting `demo-mode.js` import/cache mismatch (v72 vs v85), now aligned at v85.
- **Verification boundaries:** CI and GitHub Pages are independently verified after merging, not proof of real iOS WebKit. **No reported real iPhone confirmation** of v89 resume, v90/v91 Finance History, v92 set progression, v93 no-scroll, or v94 input zoom/keyboard. The nine-record BofA correction import remains unconfirmed; the previously imported 478 bank transactions were not changed by v95.
- **Cycle closure:** v91 (Finance review), v92 (set/Undo), v93 (no-scroll), v94 (iPhone keyboard), v95 (stabilize) implemented. Future feature suggestions are not preapproved requirements.

## v96 release scope and outstanding device review

- Merchant rules operate across **all transactions**, not solely Bank of America. Rules match merchant/manual description, immutable bank description, or either; optional exact amount reduces false positives. Rules suggest category, subcategory and merchant only and must be approved; conflicting rules are withheld.
- The rule collection is persisted by v96 notebook normalization, compact JSON encoding/decoding, cloud/device recovery and offline JSON workspace. Device-to-cloud migration copies distinct rule IDs and uses a collision-safe alias when needed. Old notebooks default to an empty collection.
- The Finance area has Manage merchant rules and Classification review. Previewed suggestions and ChatGPT enrichment changes show old/new fields and per-row selection, all via the existing cloud-revision-gated import save path.
- Fresh ChatGPT finance exports include expected-value columns for the editable fields. Unchanged exported values are ignored; changed values require that the live record still agrees with the original export or the proposed new value. Legacy CSVs can update type/category while changes to an existing personal description, note or itemization require a fresh export.
- The bottom tab bar is Home, Food, Lifting, Finances, Progress; the embedded loading HTML matches the runtime.
- Scope excludes auto-applying rules, automatic kind/transfer reclassification, private transaction migrations, summary dashboards and receipt inference.
- Remaining user confirmation: actual iPhone performance/keyboard/background behavior; full Finance History; whether the prior nine-row enrichment was applied to the live notebook. To reconcile, request **Finances → Export for ChatGPT**, rather than claiming the public code contains private bank data.

## v97 release scope and remaining confirmation

- **Implemented:** finance-insights-model.js derives read-only totals from current saved transaction classifications. Finances → View spending insights provides All recorded dates, last 30 days, last 90 days, and selected posted-date months.
- **Accounting boundaries:** Only expense-classified transactions contribute to category/merchant/convenience spending. Income is presented separately and can include refunds. Bank-direction-marked incoming and outgoing transfers have separate totals; manual or unknown-direction transfers are explicitly counted as unknown direction. No transfer is double-counted as spending or income. No assumed item-level attribution or checking-account-to-consumption equivalence.
- **Data limitations:** The current bank date is its posted date, not necessarily receipt purchase date. All amounts are only as accurate as existing manually reviewed classifications. The page displays uncategorized expense totals and existing financeReviewFlags counts as an incomplete review queue, not complete verification. Merchant aggregation uses stored merchant, else raw bank description, else description: similar merchants with different bank strings may still appear separately.
- **Preservation:** This release is UI/read-only model only. No migrations, transaction rewrites, new network fetches, or edits to private notebook records, stable IDs, backups or recovery semantics.
- **Verification still outstanding:** Confirm on real iPhone that v89 app switching and form saves, v90/v91 Finance History, v92–v95 Workout Buddy views, v96 classification review, and v97 insight responsiveness work. Nine-row correction CSV remains unconfirmed applied; request an actual Finances → Export for ChatGPT to reconcile before reporting it complete. Consider additional time range and merchant grouping refinements based on feedback.

## v98 scope and v99 gates

- **Budget:** `budget-model.js` stores an explicit manual balance (including negative values), recurring bills/paydays, per-occurrence Paid/Skipped markers and category monthly limits. The planner never equates bank withdrawals with itemized consumption; planned events are independent of actual ledger entries. Cash projection is an estimate, not a verified bank balance.
- **Persistence:** `budgetPlan` survives cloud/local/compact backups and legacy notebooks. JSON import reviews budget replacement; during device-to-cloud migration existing cloud budgets take precedence rather than merging separate cash assumptions.
- **Native packaging:** `native/` has Capacitor 8 configuration and package metadata; `scripts/prepare-native.mjs` creates offline web assets from the PWA release manifest; `NATIVE_IOS.md` details how to compile on macOS. Web sign-in is not verified in WKWebView. No Xcode build, native Firebase login, local data migration, HealthKit or TestFlight provisioning has been completed.
- **v99 requirements:** unified Home dashboard, native-compatible Firebase authentication, restore/migration of PWA data across isolated storage origins, real macOS Xcode build, iPhone app switching and backup tests. Windows alone cannot build/sign for iOS. Do not claim v100 achieved before signed private iPhone build and on-device tests.
- **Outstanding:** user has not confirmed applying the nine Bank of America clarifications; real iPhone v89 resume, v92–v95 Buddy and v96–v98 Finance verification remain open.
## Open work and candidate priorities — next cycle v96–v100

**These are candidates, NOT an agreed fixed release plan or automatic orders. Re-prioritize with the user's next request.**

1. **Finance classification/clarification quality:** v91 provides a read-only review queue; reviewed enrichment and actual notebook application are still outstanding. Use `Finances → Export for ChatGPT` to obtain the notebook's current stable IDs, build a reviewed enrichment CSV from known receipts and bank wording, and update personal descriptions, merchant, category/subcategory. Distinguish actual consumption, debt-account transfers, refunds, household necessities, reimbursements, and fees. Never guess ambiguous person-to-person payments or infer itemized purchase totals without evidence.
2. **Finance insights:** v97 delivers read-only category/merchant totals, 30/90-day and monthly windows, separate income/transfers, and convenience totals. Future extensions, only if requested: cost-per-calorie/protein when actual receipt itemization is matched, smarter merchant grouping, custom periods and trends. Never equate checking-account withdrawals with consumption.
3. **Transaction History refinements:** if v90 real-device feedback reveals performance/layout or navigation issues, fix those first; consider range filters, bulk review and selected transactions only when requested.
4. **Workout anatomy SVG design alternatives:** user wants to explore visually better diagrams in a **separate redesign comparison pass**; current miniature positions and subtle Push/Pull labels were fixed in earlier versions. Do not replace anatomy art without explicit approval.
5. **General reliability and usability:** data recovery, iPhone resume/foreground flows, offline behavior, quick-entry performance and UI consistency; make changes in small, reviewed steps.

Avoid inventing a v91 roadmap as if already approved. The next chat should take the user's actual immediate direction first. Before proposing new releases, distinguish device-verification issues from approved new work; don't use a new version just to report a test result.

## Interaction and implementation preferences

- Prefer direct GitHub reads/edits using connected tools; don't ask the user to re-upload the repository or to repeat decisions available here.
- The app is a **daily-use PWA on an iPhone**. Protect existing notebook data, cloud revisions, local recovery and offline use. Treat all imports as preview-first and non-destructive until confirmation.
- Keep UI lightweight, readable, practical and consistent. The user prefers concise UI hierarchy, minimal duplicated metadata, functional navigation and clear controls.
- Be precise about verification levels: **code written**, **CI passed**, **GitHub Pages deployed**, and **user confirmed on phone** are distinct.
- Avoid tests that take disproportionate time; run the focused model test and UI smoke tests relevant to the change and rely on GitHub CI for full routine checks.
- Do not commit personal statements, transaction-level bank CSVs, receipt photos, account IDs, tokens, personal medical/financial secrets or private notebook backups to the **public** repository. The contextual test case counts are enough.
- Maintain working directness; release updates should say what changed, what was tested, and what the user should test on-device. No placeholders for finished code/artifacts.

## Release workflow / quality gate

1. Verify `main` and `version.json` before edits.
2. Create a version-named branch, make small edits, add focused regression/smoke coverage. Preserve older data formats.
3. For a functional release, update `version.json`, `index.html` JS/CSS revision query strings as needed, `sw.js` cache name/precache URLs, and app registration revision. Keep version and asset references synchronized.
4. Update **this file** with delivered functionality, limitations and new open items; add detailed release notes to README when substantive. Keep historical versions accurate rather than rewriting past history.
5. Open PR, confirm CI tests and successful UI smoke; if failure, inspect job logs and fix before merging. Merge to `main` only after checks pass.
6. Verify GitHub Pages deployment status; **do not claim live** before successful deployment. Provide user a short how-to-test checklist, especially for real iPhone.
7. At the end of a five-version cycle, update this file and provide a concise opener for the next conversation. v91–v95 is documented here; next is v96–v100.

## Suggested new-conversation opener

> This is **Fitness Workless 7 — Everyday v96–v100**. Continue directly in my connected GitHub repository `https://github.com/DownAirOnly/fitness-tracker`. **First read `PROJECT_CONTEXT.md`**, then verify `version.json`, recent commits, open pull requests and GitHub Pages deployment. The v91–v95 cycle implemented Finance classification review, Workout Buddy current-set inheritance/Undo, no-scroll screens, iPhone Setup/Notes keyboard handling, and recoverable unsaved Setup drafts. Preserve all real notebook data, cloud/device recovery, and stable bank identifiers; no migrations or unreviewed imports. Outstanding: real-device verification of v89–v94 behaviors and Finance History, plus unconfirmed application of the nine-row BofA correction. Broader classification, spending insights, and additional workout enhancements are **candidates**, not approved requirements. Choose next work based on current user priorities, make focused changes, test selectively, verify Pages deployment, and update `PROJECT_CONTEXT.md` after each release. Prepare the next handoff at v100.
