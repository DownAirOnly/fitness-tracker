# Everyday — project context and conversation handoff

> **Read this file first in every new Everyday development conversation.** This is the living project handoff, not an implementation spec or a substitute for inspecting code. Check `version.json` and recent commits to confirm the current release before editing. Update this document when completing each version and before moving to a new conversation.

## Current direction — November 1, 2026

- **v99.7.10 dock-spacing pass (iPhone visual sign-off pending):** The Money overview's 18px trailing gap is now the single consistent `main` bottom gutter across Home, Food, Lifting, Money, Progress, History and Settings. Home's dashboard flex stage shrinks to leave the same gutter, and scrollable pages have last-child margins neutralized to avoid double spacing. Fixed header and calorie/protein top anchors are unchanged. User confirmed the native/context-menu top black strip is fixed on their iPhone after v99.7.9; do not rework the validated viewport fix in this release. No persistence/model changes.



- **v99.7.9 visual alignment (device verification pending):** Home's calories/protein cards and Food's single log card now use matched internal metric offsets and grid columns, retaining their different card designs. This is a CSS-only position/typography adjustment with no data changes. Black strip after native menus remains an outstanding real-iPhone verification issue; the prior v99.7.8 mitigation should not be represented as a confirmed device fix.



- **v99.7.8 follow-up:** Restore iPhone native/context-menu viewport alignment, add theme-matched document background and scroll recovery, widen reusable month navigation buttons, and share a single colored routine-card renderer between Workout Buddy and Home. On-device verification remains necessary.

- **v99.7.7 interface patch (device verification required):** Home selection labels are Eat, Work out, Spend, and a plus-only equal-width action. Bottom Finances renamed Money with dollar-sign SVG. Nutrition Home paging now shows center-position dots and separate previous/next controls instead of a number/number plus odd arrow. Home food card names use a larger consistent clamp while preserving the existing three-dot text exclusion.
- **Lifting Home:** Routines and recent training anatomy now use equal columns. Front SVG is larger and aligned upper-left, back SVG larger and lower-right, using a diagonal composition; no underlying workout or workload logic changed.
- **Viewport:** The dock is an in-flow flex sibling of the shell, no separate shell bottom padding, to eliminate the extra strip above bottom nav without clipping. Validate on iPhone after modal/focus changes.
- **Native menu top-strip mitigation:** Pin the app's root to the layout viewport with absolute positioning rather than a fixed root, use matching theme-colored document backgrounds, and normalize document scroll when native selects lose focus or app modals close. The reported persistent black band still needs iPhone verification.
- **Reusable visuals:** Calendar previous/next month controls are approximately twice as wide (58px on Home); the same `routineChoiceCard` now renders both Workout Buddy's chooser and Home's three colored recent-routine buttons. Muscle diagrams remain enlarged and staggered.
- **Dates:** The header shows a plain tracking date with no tap action. Food main has no date selector; the full All food entries modal has the date selector and Today button. Changing that date refreshes Food and full log together. History retains explicit date jumping.
- **No Money functionality or user data changes.** v99.7.6 was deployed successfully, and v99.7.7 still requires CI, merge, Pages and real-device visual validation.


- **v99.7.6 visual-only card patch (device verification pending):** One shared Food/Home food card. Remove the redundant “+ Add to today” line. Main card tap still opens food-entry form, and the three-dot edit action remains independent. Title occupies the upper ~2/3 with a float-reserved menu space on the upper-right so long names wrap beneath it, rather than overlap. Lower ~1/3 displays calories and protein as two visually distinct numeric fields. Compact styling for six Home cards, with standard Food tab dimensions, keeps the six-per-page layout unchanged. No saved data, finance, navigation, cloud schema or workout updates.


- **v99.7.5 device-fix patch (iPhone check pending):** Removed the fixed-position body and focus-based nav hiding that could contribute to iOS touch-offset / disappearing-dock behavior. App and nav now share a single fixed #app frame; native select focus is blurred on modal close. This is a plausible fix rather than a verified iPhone root cause.
- **Home Lifting is non-scrolling:** Compact reusable month grid; Schedule control in the footer, no redundant legend, Weekly Schedule subtitle or monthly totals. Below it, three *completed routines* use the same three colored picker styles as Workout Buddy alongside the existing front/back two-day training map. No "last three sets" or map color legend.
- **Home Nutrition:** Six selected cards per page, 7–12 on the next, etc., selection order stable. Footer is exactly Customize/Plan at <=6, with middle page-cycle button only at 7+. Food cards across Home/Food reuse one renderer with no favorite star on the card face; three-dot Edit definition still has Favorite checkbox. No account data migration or Money changes.
- **Checks:** Model/UI CI, merge, Pages and actual iPhone hit-target/nav checks are distinct; do not mark live or visually validated before evidence.


- **v99.7.4 patch:** Lifting Home adds a recurring weekday routine schedule stored in the Lifting account section. When configured it replaces automatic projections; actual workouts remain distinct. The workout calendar now includes the three latest logged sets alongside red/yellow anatomical highlights for muscles exercised today/yesterday (training exposure only, **not measured fatigue or medical recovery**). The map reuses `muscle-map.js` anatomy. Nutrition Home footer uses full-width buttons, with Plan instead of redundant All foods, and a middle page toggle only when 5–6 foods are selected. First page shows four cards, second the remaining one/two; order remains fixed. v99.7.3 on-device navigation remains subject to user verification.
- **Compatibility:** `workoutSchedule` is an optional top-level Lifting field. Old full backups/cloud sections without it continue to load; new saves/exports preserve it. Update tests and verify account sections/Firestore.


- **v99.7.3 pending device verification:** Saving no longer triggers any UI redraw from the persistence routine; screen changes render deliberately at the time of user action. The bottom nav is outside the scrolling shell, and only tab main content scrolls. Home top Food Add saves to the Food tab, while Home food cards save back to Home. Any Workout Buddy exit, finish or deletion goes to Lifting.
- **New reusable calendar:** `calendar-ui.js` and `CALENDAR_DESIGN.md` establish white-on-selected-green day tiles, light-green outlined completed days, white dotted projected days. Lifting Home now shows this calendar, with click-through day details and no old redundant empty block. Only consistent training history yields projections.
- **Food:** “Suggest rest of day” becomes **Plan**; combine Saved Foods and quantities to compare projected calories/protein. Existing suggestions can populate the plan; nothing is logged until user chooses Log selected.
- **No native iOS or Money expansion** in this patch. CI, Pages, and iPhone verification are distinct checks.


- **v99.7.2 patch (pending validation):** Home quick foods retain saved positions, and customization numbers items by selection order from 1–6; default cards are frozen rather than moving when lastUsed changes. Lifting Home Add opens the routine selector; the Lifting glance adds previous sessions and actual seven-day set/workout counts. Workout Buddy moves the rest countdown to the right side of the large bottom action, removing it from the top row. No finance, storage schema or backend changes.

- **v99.7.1 deployed patch:** Save acknowledgements preserve newer screens; Home Add follows the selected dashboard; Home shows four automatic food cards or up to six local custom choices; Workout Buddy keeps history full width, moves the rest countdown to set status and anchors muscle diagrams to the heading. iPhone verification required.
- **Roadmap supersession:** v99.8 UI review, v99.9 stabilization, **v100 stable PWA interface/workflow milestone, not native iOS**. Capacitor/TestFlight deferred; earlier v100-native statements below are historical.
- **Money after UI:** Prioritize safe-to-spend/paycheck-period guidance. The nine-row transfer correction is still unconfirmed.

## Snapshot

- **App:** Everyday — mobile-first personal fitness, food, workout, measurement, and finance tracker.
- **Repository:** `DownAirOnly/fitness-tracker`, default branch `main`.
- **Published PWA:** https://downaironly.github.io/fitness-tracker/ (iPhone Home Screen usage matters).
- **Source of truth:** `version.json`, the corresponding `main` commit, and GitHub Pages deployment. Version in this handoff must be reconciled with those.
- **Production before v99 verification:** **v98.2**, commit `536401acd2ebc3f9e4125cdb8b951c541afc60a9`, preserved on branch `rollback-v98-2-before-v99-verification`. The v99 verification deployment has been explicitly requested by the user; confirm post-merge GitHub Pages status and the actual live `version.json` before claiming it accessible.
- **Published verification build:** **v99** PR #15 merged into `main` at `f20aa509f27e3668e948d10cab4d66165db0c645`; GitHub Pages and the post-merge model/UI/Firestore/Health tests passed. The user tested the first impression and requested a Home redesign because of scrolling and duplicated navigation cards.
- **Next review build:** **v99.1** PR #16 on `v99-home-command-center` implements the requested Home redesign. Until PR merge and GitHub Pages deploy succeed, the public PWA is still v99. Previous v99 production stays in the git history and v98.2 is retained as `rollback-v98-2-before-v99-verification`. Do not describe v99.1 as iPhone verified or final v99.
- **Conversation cadence:** Open a new development conversation when needed; current conversation is Fitness Workless 9 for v99–v100. Keep this handoff current so new chats do not reconstruct old work.
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
| **v98.1 (deployed)** | Three private Firestore sections and one revision manifest; per-section exports and reviewed restores; legacy migration retained |
| **v98.2 (PR pending)** | Sanity audit: accurate three-section UTF-8 storage diagnostics, byte-count rule verification, smoke/asset regression tests; requires updated rules before merge |

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

## v98.2 stabilization scope and safety gate

- v98.1 code is merged and GitHub Pages deployed; real sign-in and save behavior has only informal user confirmation (“nothing broken”), not an audit of actual record IDs/counts or the untouched legacy main document.
- Settings’ v98.1 Cloud data limit and Data diagnostics still measured the combined compact JSON against 800,000 bytes, even though Firestore now saves three separate canonical section JSON documents. v98.2 replaces this with exact UTF-8 bytes for Nutrition, Lifting and Finances independently. Notes was previously a misleading constant-zero metric in this data model, so remove it.
- Firestore v98.1 rules used `payload.size()`, a character count; the app uses `TextEncoder` bytes. v98.2 changes rule checks to `payload.toUtf8().size()`, with a multibyte regression check. **Manual Firebase Console rule publishing is required before merging this PR.**
- Existing model tests, UI smoke tests, Firestore emulator/Shortcut tests, and new release-integrity checks cover broad code-level behavior; they are not real iPhone checks. Preserve stable finance IDs, all saved data, full backups, and recovery. No private data is committed.
- LocalStorage confirmed/recovery backups have a separate browser quota and eviction risk even when individual Firestore sections fit; v99 should evaluate a more scalable native/browser recovery store. Full JSON export remains necessary.

## v98.1 status — manual rules deployment gate

- **Cloud:** `account-sections.js` defines complete `nutrition`, `lifting`, `finances` JSON sections. The Firestore adapter reads legacy state/main when no manifest exists and atomically writes the three versioned docs plus `state/manifest`, all at a single revision; state/main is not deleted. Apple Health Shortcut reads/writes the same revision.
- **Backups:** Settings provides separate downloads and a checked, replacing import for one to three sections. All selected sections are applied together, after a clear preview; other sections stay untouched. Full legacy JSON backup remains supported.
- **Critical deployment dependency:** Firestore production rules currently may not authorize `state/manifest`, `state/nutrition`, `state/lifting` or `state/finances`. The repository `firestore.rules` must be published and tested in Firebase Console *before merging/deploying the v98.1 client*. Changing the public repo does not publish Firebase security rules.
- **Native integration:** The section contract will allow a verified account or local-backup transition to iPhone while retaining stable IDs. No Xcode compilation or native data migration is claimed.
## v98 scope and v99 gates

- **Budget:** `budget-model.js` stores an explicit manual balance (including negative values), recurring bills/paydays, per-occurrence Paid/Skipped markers and category monthly limits. The planner never equates bank withdrawals with itemized consumption; planned events are independent of actual ledger entries. Cash projection is an estimate, not a verified bank balance.
- **Persistence:** `budgetPlan` survives cloud/local/compact backups and legacy notebooks. JSON import reviews budget replacement; during device-to-cloud migration existing cloud budgets take precedence rather than merging separate cash assumptions.
- **Native packaging:** `native/` has Capacitor 8 configuration and package metadata; `scripts/prepare-native.mjs` creates offline web assets from the PWA release manifest; `NATIVE_IOS.md` details how to compile on macOS. Web sign-in is not verified in WKWebView. No Xcode build, native Firebase login, local data migration, HealthKit or TestFlight provisioning has been completed.
- **v99 requirements:** unified Home dashboard, native-compatible Firebase authentication, restore/migration of PWA data across isolated storage origins, real macOS Xcode build, iPhone app switching and backup tests. Windows alone cannot build/sign for iOS. Do not claim v100 achieved before signed private iPhone build and on-device tests.
- **Outstanding:** user has not confirmed applying the nine Bank of America clarifications; real iPhone v89 resume, v92–v95 Buddy and v96–v98 Finance verification remain open.
## v99.7 — Workout Buddy history, completed exercise cards and responsiveness
- History preview and active rest countdown share a two-column row. The rest timer remains visible on the right. Expanded history is a vertically scrollable area within the left panel, not a popover overlapping the timer or inputs; the existing small-viewport scrolling safety fallback remains.
- After completing an exercise, the next-exercise picker displays horizontally scrollable completed exercise cards with muscle diagram peek controls; selecting these opens a muscle view, not another set. Remaining exercises are still selectable.
- Buddy transitions render through `buddyOpen()` **before** awaiting `persist()`, avoiding UI stalls while a Firebase save completes. Do not remove local recovery, cloud queue/conflict handling, failure warnings or existing data protection. This addresses a plausible cause of reported 2–5 second delays; other latency sources remain unmeasured.
- v99.7 is a PWA polish release preceding the planned v100 native iOS work. A native wrapper by itself does not eliminate network wait or heavy JavaScript work.
- No user JSON/schema, stored records, budget calculations, Firebase permissions or account settings are migrated. Versioned HTML/JS/CSS, cloud import, service worker and `version.json` updated. Validate CI and real-device geometry/touch response.

## v99.6 — Interface declutter across Home, Food, Lifting, Finances, Progress
- **Home:** The full-height dashboard was sitting slightly behind iPhone bottom navigation. Reserve 82px plus iOS safe area rather than 66px, preserving the no-document-scroll dashboard design.
- **Food:** Remove large Food title, redundant "Viewing" above the date (retain `aria-label="Food date"`), and standalone Recent foods section. Existing quick-add cards stay; repeat an entry via the full food log. Remove external Sort label on More foods and make the native option read "Sort: Recent".
- **Lifting:** Remove page title, routine label, separate date picker, routine eyebrow and "Choose an exercise" heading. Select any saved routine via a native dropdown, with Manage beside it; actions for Exercises, Edit workout and + Custom remain. Workout Buddy becomes a compact entry with Start or Resume (and End for an active session), not a redundant manual lift button. Individual exercise logging and + Custom still work.
- **Finances:** Remove only the large overview page title, leaving all finance controls and data unchanged.
- **Progress:** Remove page title, week-start reminder and summary eyebrow. Change the weight trend calculation to a rolling **seven calendar days** to accurately support the "7-day average" legend/headline, preserving actual weigh-in points and endpoints. Remove the weight-chart explanatory paragraph and body-fat graph's redundant "Body composition" center label; keep both date endpoints and weight-change summary.
- **Safety/compatibility:** No changes to stored food, lifting, budget, progress, or account schemas, Firebase rules, sign-in, or sync/recovery protection. Update HTML, JS, CSS, cloud module import, service-worker manifest and version to v99.6. Confirm CI and iPhone visual alignment after deployment.

## v99.5 — Home spacing, account banner and centered gear
- Reset only Home's two main `<section>` bottom margins, which inherited the old global 27px margin and caused a large unwanted gap above dashboard tabs. Explicit Home flex gap and single-viewport dashboard remain.
- Remove redundant standard account status/Account button from signed-in Food, Lifting, Finances, Progress, History and Settings, and from signed-out Home and other ordinary tabs. The gear opens Settings, which retains sign-in, sign-out, account details, storage and sync management. Preserve visible real recovery/save warnings plus distinct demo and offline-workspace indicators.
- Replace the old asymmetrical gear outline with an 8-fold symmetrical gear and concentric `cx=12, cy=12` hole. Match the initial HTML skeleton and runtime SVG.
- Align assets, HTML, cloud module URL, service worker and `version.json` at **v99.5**. No changes to user records, Firebase rules, budgets or data schemas. UI checks cover all three fixes; verify on iPhone after deployment.

## v99.4.2 — Home target typography hotfix
- Match the Food daily totals shown in the iPhone screenshot: calories/protein consumed stays large, while the inline slash and target are subdued 12px text. Keep the existing Home logged-value styling, both uppercase labels, progress bars, saved targets and the single-line ratio.
- The target's protein g suffix inherits the same small text; theme-specific muted colors work in light and dark modes.
- No data/calculation/interaction changes. Align versioned assets, service-worker cache and smoke checks. Verify on a physical iPhone.

## v99.4.1 — Home nutrition metric ratio hotfix
- On Home, show calories and protein as **logged / target** on one line, retaining the uppercase category label, current number typography/color, original protein unit treatment and each progress meter.
- Remove the redundant “of target · remaining/over” line. The goal is still read live from the user's settings; no numerical calculations, records, preferences, sign-in, data schemas or Firebase rules change.
- Loading skeleton, service-worker asset revision and UI smoke assertions are aligned. This is a small follow-up to v99.4; real-iPhone appearance needs verification after publication.

## v99.4 — Home controls and shared header spacing (PR #19 merged)

- User's screenshots showed Home header noticeably lower than Food. Cause: accumulated Home-specific standalone safe-area `padding-top` overrides, combined with a Home-only short header. The ordinary pages already have safe iPhone placement. The Home shell now explicitly adopts the same **zero additional top padding and standard 84px header** to align the brand/date/settings controls across tabs. Validate on actual iPhone after Pages deploy.
- Users perceived the Food/Workout/Spending row, Nutrition/Lifting/Money dashboard tabs, and five bottom nav items as three repeated groups. Replace the dedicated action row with **one + Add dialog control beside the dashboard tabs**. The dialog contains the three original action flows (Food, Workout/Resume, Spending), preserving their forms, saves, navigation context, and account storage protections.
- Dashboard tab order is **Nutrition, Lifting, Money**, with Nutrition as default only when no local selection already exists; preserve last selection. The large dashboard card and calorie/protein goal text are intentionally retained.
- First paint, assets, SW cache revision and UI tests align to v99.4. No data schema or Firebase rules changes. Preserve v99.3 rollback and confirm both CI and user device before treating design as signed off.

## v99.3 — Design language, navigation and loading correction (PR #18)

- User explicitly approved the v99.3 cleanup **except** shrinking the dashboard card or removing calorie/protein goal details. The Home dashboard remains large with a single swipeable card; metrics and top buffer become slightly more compact.
- Home quick buttons are real actions (“Log food”, “Start workout”/“Resume”, “Log spending”); bottom nav remains five section destinations. Food, Lifting (redrawn diagonal dumbbell), Finance, Home, Progress and Settings share a single lightweight SVG icon family.
- Remove double dashboard headings (“YOUR DASHBOARD”, “Money at a glance”), ornamental “eyebrow” captions above page titles, and boilerplate copy. Keep factual financial data source, stale balance, cloud save/recovery and destructive import warnings. Finance card stays its original height and avoids repeating missing-data messages; one primary action.
- The Nutrition dashboard now reuses actual `foodQuickCard()` components from the Food tab and no longer shows Quick Repeat / Meals you know / Favorite or recently logged portions. Home quick-add routes to the intended *today*; demo uses `DEMO_LAST_DATE`. No food data migration.
- Fix a user screenshot-confirmed startup defect: `render()` had appended enormous Offline JSON and error sections beside the Home skeleton in a flex row, crushing the content. Keep a single Home loading root, no fake Account dash row; only show recovery modal for a real failed account load. No home vertical scroll or clipped emergency actions.
- Versioned index, JS, CSS, SW, cloud import and manifest aligned to v99.3. Test early loading, shared icons, reuse of quick-add cards, actual workflows, demo integrity and Firestore/Health. **Before claiming live/verified**, confirm feature-branch CI, merge, Pages, post-merge tests and real iPhone feedback. Keep v99.2 rollback.
  
## v99.2 — iPhone Home viewport / PWA update recovery (verification patch)

- User screenshot after v99.1 deployment still showed **v99** oversized Food/Lifting navigation cards, weight strip, account banner and vertical scroll. This is a stale installed client, not proof that the v99.1 bundle rendered incorrectly; GitHub Pages deployment had succeeded. Do not infer version solely from a Pages workflow; check the version shown in Settings on the device.
- Branch `v99-2-iphone-home-viewport` includes Home-only document scroll lock on html/body, zeroed scroll offset when Home renders, standalone status bar/safe-area padding, non-scroll dashboard and reduced short-screen content. The Home must not vertically scroll, even with an account banner. Other tabs remain scrollable. Gestural dashboard switching and overlays remain operable.
- Full cloud recovery/save warnings remain available through a compact Home Review alert, not a large content banner; no persistence/security rules changed. Settings includes a safe manual app-refresh control; it does not clear storage or delete the installed app.
- Align v99.2 HTML, CSS, JS, service worker cache and version.json; smoke-test document locks, recovery access and legacy workflows. Confirm CI and Pages separately and request actual iPhone verification.
- The user has not signed off on v99 or v100. Keep v99/v98.2 rollback points intact.

## v99 — interaction polish (passes 1–4 deployed, v99.1 Home correction pending)

- **Vision:** Finances should answer available cash, upcoming bills/income and spending outlook before exposing configuration. Four UX passes have been implemented, and the user requested a verification deployment before finishing the remaining v99 work.
- **Finance Overview implemented on branch:** Top-level Finances now shows a manual available-cash hero with an as-of date and source, next *expected* paycheck, 14-day planned bills, a conservative outlook, upcoming scheduled events and direct routes to transactions and planning. The three-way navigation is Overview / Transactions / Planning.
- **Cash provenance:** `finance-overview-model.js` derives read-only figures from the saved `budgetPlan`. It does not use transaction history to invent bank cash. Future income never increases current available cash or the spending estimate. Missing manual balance, stale balance, or missing scheduled bills withhold the estimate; displayed estimates disclaim incomplete/unverified schedules. A balance entered for end-of-day today excludes already included same-day events.
- **Transactions pass 2 implemented:** Type (Expense/Income/Transfer) is visible during quick entry rather than hidden in the additional fields. The page emphasizes the compact entry form, the five most recent transactions, a prominent review queue when categories/transfer flags need attention, and Search all/Spending insights. Bank import, prepared CSV, ChatGPT enrichment and merchant rule tools are in an expandable Import & organize section; all original handlers remain usable. History has one-tap All / Expenses / Income / Transfers / Needs review filters and an expandable advanced filter section; opening All transactions resets previous filters to avoid surprising empty results. Accidental repeat submissions on the same finance form instance are guarded during persistence. No financial model, import or cloud storage migration.
- **Planning pass 3 implemented:** The default Planning view centers on manual available cash, scheduled bills and paydays needing action, and monthly spending caps. Unmarked dates in the preceding 14 days remain visible and are labeled as *unmarked past dates*, not confirmed overdue bank charges; pending dates through the next 14 days are shown directly, later dates in the 35-day horizon and marked dates are under separate drawers. A due-date row has a primary **Paid** (expense) or **Received** (income) action and contextual More / Skip-this-date / Edit-schedule actions. Legacy status `paid` is intentionally unchanged in JSON even for Received. Undo restores an unmarked occurrence. Recurring definitions and one-per-date markers are distinct UI sections; schedule edits now preserve optional `endDate` and prior markers. The monthly caps retain categorized expense calculations. The 35-day forecast / what-if lives in an optional drawer and requires today's manual cash plus a schedule. Stale or missing balances suppress forecasting; very old balance dates no longer crash Planning. The forecast explicitly assumes future paychecks and entered bills and must not be read as safe-to-spend cash. No bank records, marker schema, or Firebase rules were migrated.
- **v99.1 Home correction (PR #16, pending release validation):** The daily calorie/protein summary moves to the top; oversized Food/Lifting cards, Home weight strip and normal signed-in account banner are removed. Three equal compact SVG actions open Food, Workout Buddy and a **shared Finance transaction modal** that reuses the exact existing Finance fields, model validation, duplicate-submit guard, and persistence. The modal does not navigate away; on successful save the user returns to the previous screen with confirmation. A viewport-fit Home displays one of three horizontally swipable/explicitly tabbable cards: manual cash/next bills, most recent lifting routine and a conservatively inferred next routine (day shown only when four recent consistent sessions permit), or favorited/recent nutrition portions for quick logging. Card selection persists in **local device UI preferences only**, never in cloud account data. Short/zoomed viewports, signed-out account banners and critical sync warnings retain a safe scrolling fallback. First-paint HTML skeleton, app/assets and service-worker cache are aligned at `v99.1`. Do not treat forecasts or next-session suggestions as confirmed facts.
- **Tests added/updated:** Pure cash snapshot assertions and UI smoke for all Finance screens, including Planning's due-date queue, Received vs Paid, contextual Skip, Undo, recurring end-date persistence, spending caps and unchanged bank ledger. Passing GitHub CI remains distinct from real-device validation or live deployment.
- **Home / Food / Lifting pass 4 implemented:** Home preserves Food and Lifting as its first two large actions and adds direct Log food (always for today's tracking date), Start/Resume Workout Buddy, and Log spending shortcuts. Food surfaces four recent distinct previous portions with **Log again** and offers the same action in the full daily log. Re-log opens a *new editable draft* containing the previous per-serving calories, protein, and portion quantity; defaults to the selected tracking date (Home always chooses today) and does not silently save another food definition. Cancel leaves the old record unchanged; saving uses the existing Food form, normalization, batch, persistence, and receipt-time logic. Gym now exposes Log manual lift next to Workout Buddy Start/Resume; the editor remains the original tested lift form. Workout Buddy set inheritance, Undo, focus/keyboard, anatomy, progress, history and persistence logic were **not** rewritten. Responsive layouts and UI smoke checks were added for entry points and nonmutation.
- **Remaining v99 passes, prioritized:** (1) Progress, settings/save-state clarity, resume/offline/accessibility reliability; (2) full release candidate with backup/security regression and real iPhone verification. Preserve all existing records.
- **Verification deployment exception (user requested):** Passes 1–4 are promoted as an explicitly *unfinished* production test build so the user can check on their own iPhone. Preserve v98.2 rollback branch; do not imply Pass 5, live Pages publication, or real-device validation is complete until confirmed. Avoid changing Firebase rules. Before any further v99 commit, change the service-worker cache key and asset query revisions to prevent an old cache masking new fixes.
- **v100 remains native:** Capacitor scaffold is not an installed app. Native Firebase authentication and same-account verification, PWA-to-native migration, lifecycle/HealthKit handling and macOS Xcode signing/testing are outstanding.

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
