# Everyday — project context and conversation handoff

> **Read this file first in every new Everyday development conversation.** This is the living project handoff, not an implementation spec or a substitute for inspecting code. Check `version.json` and recent commits to confirm the current release before editing. Update this document when completing each version and before moving to a new conversation.

## Snapshot

- **App:** Everyday — mobile-first personal fitness, food, workout, measurement, and finance tracker.
- **Repository:** `DownAirOnly/fitness-tracker`, default branch `main`.
- **Published PWA:** https://downaironly.github.io/fitness-tracker/ (iPhone Home Screen usage matters).
- **Source of truth:** `version.json`, the corresponding `main` commit, and GitHub Pages deployment. Version in this handoff must be reconciled with those.
- **Latest implemented release covered here:** **v91**, non-destructive Finance Classification Review. Verify merged main version and Pages deployment before calling v91 live.
- **Conversation cadence:** New ChatGPT conversation after each **five-number release cycle**. The previous cycle was **v86–v90**; current is **v91–v95** (suggested chat title: **Fitness Workless 6**); after that **v96–v100**.
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
| **v91** | **Finance classification review queue:** shortcut and review filters for uncategorized records and possible bank transfer mismatches; no automatic changes |

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

## Outstanding work: next cycle v91–v95

**These are candidates, NOT an agreed fixed release plan or automatic orders. Re-prioritize with the user's next request.**

1. **Finance classification/clarification quality:** v91 provides a read-only review queue; reviewed enrichment and actual notebook application are still outstanding. Use `Finances → Export for ChatGPT` to obtain the notebook's current stable IDs, build a reviewed enrichment CSV from known receipts and bank wording, and update personal descriptions, merchant, category/subcategory. Distinguish actual consumption, debt-account transfers, refunds, household necessities, reimbursements, and fees. Never guess ambiguous person-to-person payments or infer itemized purchase totals without evidence.
2. **Finance insights:** category and merchant spending totals over selectable time windows, meaningful expense vs transfer separation, convenience spending insights, cost-per-calorie/protein where purchase itemization can be matched reliably. Do not equate checking-account withdrawals with consumption.
3. **Transaction History refinements:** if v90 real-device feedback reveals performance/layout or navigation issues, fix those first; consider range filters, bulk review and selected transactions only when requested.
4. **Workout anatomy SVG design alternatives:** user wants to explore visually better diagrams in a **separate redesign comparison pass**; current miniature positions and subtle Push/Pull labels were fixed in earlier versions. Do not replace anatomy art without explicit approval.
5. **General reliability and usability:** data recovery, iPhone resume/foreground flows, offline behavior, quick-entry performance and UI consistency; make changes in small, reviewed steps.

Avoid inventing a v91 roadmap as if already approved. The next chat should take the user's actual immediate direction first.

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
7. At the end of v95, update this file for the next cycle **v96–v100** and use a similarly short new chat opener.

## Suggested new-conversation opener

> This is **Fitness Workless 6**, covering **Everyday v91–v95**. Work from the connected GitHub repository `DownAirOnly/fitness-tracker`. **First read `PROJECT_CONTEXT.md`** and verify `version.json` plus the latest deployment. The living context documents implemented features, open issues, data-safety rules and the roadmap candidates. Don't ask me to re-upload code already available via GitHub. Keep releases small, test selectively, deploy with GitHub Actions, and update `PROJECT_CONTEXT.md` after every version. Prioritize anything still unresolved before proposing the next feature.
