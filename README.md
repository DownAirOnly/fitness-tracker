# Everyday fitness tracker

**For current development state and next-conversation handoffs, read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) first.** It is updated with each version and marks confirmed functionality, pending device verification, and proposed future work. This README retains the detailed historical notes.

## v99.7.11 — shared nutrition metrics and quick-food cards

- Home and Food now render daily calories/protein with one shared numeric + progress-meter component. Font face, font size, units, goal text, bar height, width, top offset and left edge match exactly when switching Home ↔ Food. Each page retains its established foreground/background and meter-fill colors.
- The Food quick-add card is the standard reusable renderer; Home uses that same card with a compact size modifier rather than a divergent visual treatment. It keeps the Food card’s title-to-macros proportions, title-wrap clearance, 3-dot edit control, footer styling and nutrition-accuracy marker at reduced scale.
- Home dashboard tab uses one-word **Workout**. The initial loading shell matches the current Home tabs, plus-only action and shared metric structure.
- No changes to saved records, preferences, cloud sync, workout scheduling or Money. Validate positioning and six compact cards on a real iPhone, especially shorter viewports.

## v99.7.10 — consistent bottom spacing across tabs

- Use Money's existing 18px bottom gap as the shared spacing between page content and the dock on Home, Food, Lifting, Money, Progress, History, and Settings.
- Home's full-height dashboard now ends above that reserved gutter instead of touching the dock; its contents retain a non-scrolling compact layout. Scrollable pages use the same main padding, replacing inconsistent last-element margins.
- No change to fixed header positioning, calorie/protein anchors, data, authentication, save behavior, or iPhone menu-viewport workaround.
- User confirmed the black strip from native/context menus no longer occurs on their iPhone after the prior release. The new spacing still needs iPhone visual confirmation.

## v99.7.9 — stable calorie/protein anchors between Home and Food

- Keep both daily calorie and protein values anchored to matching column positions and label/value heights when navigating Home → Food. Food retains its single full-card tap target, dark appearance and detailed log; Home retains its separate metric cards. No data or behavior changes.
- The native-menu black strip is **not confirmed fixed on iPhone**. v99.7.8 added a mitigation, but real-device screenshots/version confirmation are still necessary; avoid claiming another fix on CSS inspection alone.

## v99.7.8 — Native-menu viewport and shared routine cards

- Anchor layout to the viewport with a theme-matched background and normalize accidental document scroll on select/modal dismissal; check the reported black strip on iPhone.
- Reuse the colored routine-card component in Workout Buddy and Home; month arrows have wider hit areas.

## v99.7.7 — Home controls, stable dock and focused dates

- Context-menu viewport mitigation: absolute root plus native-select scroll normalization and theme-matched document background (iPhone verification pending).
- Month navigation buttons now have roughly double-width tap areas. The same colored routine-choice card component serves Workout Buddy and recent routines on Home.

- Home dashboard labels: Eat / Work out / Spend, with an equally sized plus-only fourth action. Bottom Finances becomes Money with a dollar-sign SVG.
- Home quick food paging uses centered dots and separate back/forward chevrons; 1–6 remain the first page.
- Home card titles are larger and retain the dedicated three-dot clearance. Workout Home recent routines and diagrams share a roughly 50/50 split, with the two anatomy figures staggered diagonally and enlarged.
- The app uses a flex-height shell plus an in-flow bottom dock; this removes the extra padded strip above the dock while preserving the bottom safe area.
- Header date is display-only. Food's date picker and Today shortcut live in All food entries; Food main is no longer duplicated with its own date picker. History still has its own date-jump controls.
- No saved record, account schema, finance or native packaging changes.

## v99.7.6 — Shared food-card visual refinement

- Food and Home share a two-zone card: readable multi-line name above and side-by-side calorie/protein figures below; no redundant Add instruction.
- The independent upper-right three-dot edit button keeps its own tap target and protected space so the first title lines do not run underneath it.
- Existing food logging, Favorite checkbox in the edit form, nutrition-accuracy markers, ordering, and six-card Home paging are unchanged.

## v99.7.5 — Stable iPhone dock, smaller calendar, six food cards per page

- Nav is always visible inside a single fixed app frame, avoiding a fixed `body` and select-focus rule that could create iPhone hit-test offsets. Verify on a real iPhone after native dropdowns and tab changes.
- Home Lifting uses a compact non-scrolling workout calendar with Schedule at the bottom. It displays three recent completed routines in Workout Buddy picker styling beside the red/yellow training map, without extra labels and monthly totals.
- Nutrition Home shows six cards on each page, only paginating after six; Customize and Plan divide the footer when no paging is necessary. Shared food cards no longer show a favorite star; the Favorite checkbox remains in the three-dot edit dialog.

## v99.7.4 — Weekly workout schedule, recent sets and Home food pages

- Workout calendar supports recurring weekdays and optional saved-routine choices; configured schedule overrides historical projections. It is saved with Lifting data, and old backups remain compatible.
- The Home Lifting panel shows three last recorded sets and a two-day anatomy overlay (red: trained today; yellow: yesterday), a training history visualization rather than a true fatigue measurement.
- Home food shortcuts use all footer space: Customize and Plan, with a middle page toggle for five or six cards. Cards retain customized order.

## v99.7.3 — Stable navigation, reusable calendar and food Plan

- Cloud/local saves update durability status without rebuilding screens; tab content scrolls inside a fixed shell with independently anchored bottom nav.
- Home top Food Add returns to Food after saving; Home quick-food cards remain on Home. Workout Buddy exits into Lifting.
- Lifting Home features a reusable marked calendar (`calendar-ui.js`, `CALENDAR_DESIGN.md`).
- Food's Plan is a non-destructive what-if combination editor with Suggest and explicit Log selected.

## v99.7.2 — Fixed card order, Lifting glance and rest placement

- Home quick-food order remains fixed as foods are used. Customize now numbers selections in the order tapped, up to six.
- Lifting Home Add opens the saved routine picker again. The Lifting dashboard includes last-seven-day workout and set counts plus two earlier sessions.
- Workout Buddy shows the rest countdown on the right side of its large bottom action button instead of near the set progress.

## v99.7.1 — Navigation and usability patch

- Cloud save confirmations no longer rebuild new screens or active dialogs.
- Home Add directly opens Food, the selected Workout Buddy routine, or Spending; Food shows four automatic quick cards or up to six customized local cards.
- Buddy history stays full width, rest moves to set status, and muscle art anchors to the title.
- Native iOS packaging is deferred; v100 becomes an interface/workflow milestone.

A small mobile-first web app for food, lifting, progress, and finances. The Home command center places today's calorie/protein numbers above compact Food, Workout and Spending actions; a swipable dashboard shows finance, lifting or nutrition insights. Weight is available in Progress. On the first visit after 6 a.m. local time each day, the app may offer an optional weigh-in prompt with **Enter later**.

## v99.4 — Streamlined Home and consistent header (verification build)

- Home no longer shows three Food, Workout, and Spending shortcut tiles *alongside* three dashboard tabs and five section tabs. There is one **+ Add** button aligned in the same row as the dashboard switcher; it opens a compact, accessible modal with Food, Workout (or Resume), and Spending actions, reusing the existing editors and validation.
- Home dashboard tabs are ordered **Nutrition / Lifting / Money**. Nutrition becomes the default for first-time viewers; the last-selected dashboard remains saved locally on each device.
- The Home header uses the **same 84px header and zero shell top padding as Food, Lifting, Finances, and Progress**, fixing the large Home-only top gap seen in v99.3 iPhone screenshots. Home stays non-scrolling, and the bottom nav remains unchanged.
- One row of Home controls instead of two; the main dashboard card remains full-size; calorie/protein goal labels and data remain unchanged.
- No stored data model, authentication, transaction, backup, cloud, or Firebase rules changes. CI, Pages, and actual iPhone validation remain separate checks.

## v99.3 — Design and copy refinement (verification patch)

- Preserve the large, single-card Home dashboard and the existing calories/protein goal descriptions. Tighten only the metrics, Home buttons and excess space above the header.
- Quick actions explicitly mean **Log food**, **Start/Resume workout**, **Log spending**, while the fixed bottom bar navigates to the full **Food, Lifting, Finances** sections.
- Shared hand-drawn SVG line icons now cover Home actions, bottom navigation, Progress, Settings and Finances. The former workout weight-stack icon was replaced with a recognizable diagonal dumbbell.
- Home card tabs **Money / Lifting / Nutrition** provide their own identity, with no extra “Your dashboard”, “Money at a glance”, “Quick repeat”, or filler titles. Card height remains intentionally unchanged.
- Nutrition dashboard directly reuses the Food tab's saved-food **quick-add cards**, favoriting and edit controls; Home actions use today's tracking date. Demo mode uses its fixture date rather than incorrectly jumping to the real calendar.
- Removes decorative uppercase pre-headings and unnecessary marketing/tagline-style explanations throughout Food, Lifting, Finance, Progress, History and Settings, while retaining material financial provenance, projected-vs-actual distinctions, sync warnings and import safety.
- Initial loading renders a single Home skeleton without enormous offline-workspace content or placeholder account row. Only an actual failed account load opens a recovery dialog. First-paint HTML and cached assets are synchronized to v99.3.
- No changes to stored user data, auth, backups, Firebase rules, bank transaction identifiers, or model schemas. Real iPhone sign-off remains necessary.

## v99.2 — iPhone Home viewport and stale-app recovery
- Screenshot after the v99.1 Pages deployment showed the **older v99 layout** (oversized Food/Lifting cards, weight strip and account banner). This means the installed PWA had not loaded the newly published bundle; GitHub Pages publishing alone does not confirm the iPhone refreshed.
- v99.2 locks the document and Home card from vertical scrolling, resets any previous page scroll on navigation back to Home, and leaves room for standalone iPhone status bar and safe-area dock. For very short screens the card compresses secondary descriptions rather than creating a long page.
- An unsynced or conflicted account now shows a compact visible warning on Home; tap Review for the **full existing cloud recovery actions**, without compromising data or adding an oversized banner to Home.
- Settings includes a **Reload latest app** action that verifies network access, respects unsaved changes, asks the service worker to update and reloads without clearing user data. This action exists in v99.2 and later; old cached clients need a normal browser/app relaunch first.
- No schema, Firebase rules, cloud section, record, or bank identifier changes. Keep real iPhone verification outstanding until screenshot confirms the v99.2 command-center layout and no Home scroll.

## v99.1 — Home command center (PR #16; verify CI and Pages before claiming deployment)

- Daily calories/protein first, three coordinated SVG quick-action buttons beneath, no duplicate Home navigation tiles and no Home weight strip. Normal signed-in account management remains in Settings; sign-in/demo/offline controls and sync warnings remain accessible.
- Food uses the existing entry modal, Workout uses existing Workout Buddy, and Spending now opens the **same Finance entry fields in a modal** instead of switching tabs. Saving closes the overlay and returns focus to the previous context; existing transaction validation and cloud protections are reused.
- A single dashboard card at a time: conservative manual-cash and upcoming-bills summary, latest and next suggested lifting routine, or saved/recent food portions with quick-log actions. Select a card by tabs or horizontal swipe; the choice is stored only in local UI preferences. Calendar-day guesses require consistent recent workout history.
- Home fits a normal phone viewport; on short screens, signed-out Home, or when save/recovery warnings appear, scrolling remains possible rather than clipping controls. CSS includes light and dark themes. This patch is a user-requested verification correction, not final v99 approval.

## v99 — Verification build (passes 1–4, user-requested deployment)

- Finances now opens to an Overview that distinguishes **manually entered available cash** from expected paychecks and planned bills. A 14-day upcoming-bill total and a conditional spending outlook make the important decisions easier to find.
- The outlook subtracts planned expenses from the entered starting cash and **does not count future income as available cash**. It withholds an estimate when the balance is absent/stale or expenses are not scheduled; it is not a guarantee that every bill was captured.
- Three-section Finance navigation separates Overview, Transactions, and Planning. Transactions now has visible quick-entry Type selection, a short recent ledger, contextual Review access, and concise links into History and Spending insights. Bank/CSV import, enrichment, classification and merchant rules are behind an expandable tools section instead of repeated feature cards. History includes immediate All/Expense/Income/Transfer/Needs review chips and expandable advanced filters; full-history entry clears stale filters.
- Planning now begins with **manual cash and the next scheduled due dates**; mark expenses Paid or incoming money Received, or use More to skip one date or edit its recurrence. Future and completed dates, recurring schedule definitions, and the 35-day what-if forecast are separated behind expandable sections. Recent unmarked past dates are explicitly *not* bank-verified overdue balances; optional projections hide when your cash date is stale or missing. The monthly category caps remain visible, and the optional ending date survives schedule edits. No existing occurrence statuses or bank transactions are migrated.
- New model regression tests and updated UI smoke cover these changes, including quick-entry type, compact tools, History filter navigation and Planning mark/undo actions. Finance form submissions are guarded against same-form double submits while persistence runs. No transaction, bill schedule, category, identity, backup format or Firestore document is migrated by the new overview. The native iPhone milestone remains v100.
- **Home / Food / Lifting UX (v99 pass 4):** Home keeps Food and Lifting as the main actions while providing compact one-tap Log food, Start/Resume Workout Buddy, and Log spending shortcuts. Home food logging always selects today rather than a previously browsed date. Food shows recently recorded portions with **Log again**; the full Food log includes the same action. Repeated entries open a new editable form with the old quantities/macros copied, while the previous log stays intact and Save as new food starts unchecked to avoid library duplicates. The Gym screen exposes a manual-lift entry beside Workout Buddy without changing the workout state machine. The responsive layout and UI smoke tests cover these routes.
- **Verification status:** By user request, PR #15 is being deployed before Pass 5 to test the changes on a real iPhone. This is **not a completed v99 release**. v98.2 is preserved on `rollback-v98-2-before-v99-verification` (SHA `536401acd2ebc3f9e4125cdb8b951c541afc60a9`). Confirm the actual published app, account, sync and records before trusting the test build. Subsequent v99 fixes require fresh asset revisions and a new service-worker cache name.

## v96 — Reviewed finance classifications & merchant rules

- Finance can save reusable, disabled/enabled, editable and removable merchant rules for all bank-imported and manual transactions. Rules use case-insensitive text matching with optional exact amount; suggestions do not automatically change transactions, bank facts or expense/income/transfer kind.
- A full-ledger classification screen separates rule suggestions and ambiguous matches; rule proposals are reviewed field by field, with per-record selection before the existing protected import/save flow. ChatGPT correction CSVs additionally export expected field values, so stale full-row returns cannot overwrite newer personal edits. Legacy CSVs cannot replace existing personal descriptions, notes or itemizations without those baselines.
- Classification rules are included in cloud, device/offline and JSON backup records, with backward-compatible empty defaults and collision-safe device migration. Existing financial IDs and real transaction data are unchanged by installing v96.
- Bottom navigation now reads Home · Food · Lifting · Finances · Progress (Progress is far right).
- Device verification and the previously prepared nine-row debt/overdraft enrichment remain outstanding until a current private notebook export is reviewed. No live bank CSV or transaction details are committed to this public repository.

## v97 — Finance Spending Insights

- Finance now has a **View spending insights** page with All recorded dates, trailing 30/90 calendar days, and individual recorded months.
- All summaries are **read-only** and based on saved transaction classifications. Expenses, income/credits, bank-marked outgoing and incoming transfers are distinct; transfers without original bank direction are listed separately and never guessed.
- Category and merchant spending groups use exact stored descriptions/labels, with no speculative merchant normalization or receipt itemization. Convenience Food is shown as a separate category-based figure rather than inferred from restaurants or protein purchases.
- Shows uncategorized expense dollars and the current automatic review-flag count. These are incomplete validation signals, **not** evidence all remaining classifications are correct. Bank records use **posted dates** rather than assumed purchase dates.
- The page works for local, cloud, demo and offline JSON workspaces without saving/migrating records. It does not include budgeting, net-worth claims, personalized savings forecasts, or modifications to private financial information.

## v98 — Everyday Budget and Native iOS groundwork

- **Budget & cash flow:** manual available-cash anchor, 35-day projections, minimum future cash and shortfall warnings, and read-only purchase scenarios.
- Schedule one-time, weekly, biweekly and monthly expenses/paydays with per-date Paid, Skipped and Undo markers. These are planning records, never bank transactions.
- Configure monthly category limits based on actual classified expense transactions, excluding transfers and income.
- Preserves the budget in compact JSON/device/cloud backups; old notebook formats default to an empty budget. Cloud migration retains existing cloud budgets rather than silently merging personal monetary assumptions.
- Includes a separate Capacitor 8 scaffold (`native/`), deterministic web bundle script (`scripts/prepare-native.mjs`), and `NATIVE_IOS.md`. **No native signing, iPhone build or native authentication is verified yet.**
## v98.1 — Three account JSON files (deployed after rules published)

- **Per-account cloud format:** Nutrition, Lifting, and Finances are stored as three separate private Firestore JSON documents alongside an atomic revision manifest. Saving one notebook revision updates all three together. The old `users/{uid}/state/main` combined document is retained as a read-only migration fallback. This is not a storage purge.
- **Separate JSON files:** Settings → Import & backup provides Export Nutrition JSON, Export Lifting JSON, Export Finances JSON, and Import separate JSON files (one, two or three). A section file has `format: "everyday-section-v1"`, `section`, and a complete `data` object. Importing replaces only selected sections with explicit review; unselected sections are preserved.
- **Schema:** Nutrition contains settings, food definitions/entries, weight/body-fat records and prompt date. Lifting contains exercise definitions, workout templates, lift logs, active workout and workout history. Finances contains transactions, merchant classification rules and budget plan.
- **Migration:** Existing signed-in notebooks are first read from legacy `state/main` until the first successful signed-in save after new rules are published. Migration is atomic; the legacy document remains unchanged. Each section is limited to 800,000 UTF-8 bytes. Accounts need the updated `firestore.rules` **published before this client update is deployed**, or cloud reads/writes will be denied.
- **Apple Health:** The Shortcut bridge now shares the atomic section revision, and maintains existing duplicate prevention and account conflict detection.
- **v100:** This structure also establishes the JSON contract for native PWA-to-iOS migration; it does not prove a native app can yet be signed or installed.
## v98.2 — Full-application sanity pass (deployed)

- **Correct three-file storage reporting:** Settings shows Nutrition, Lifting, and Finances as three independently measured UTF-8 JSON payloads (up to 800,000 bytes each), and diagnostics list the three sizes plus their uncapped combined total. The old single 800 KB whole-account meter and permanently zero “Notes” metric are removed.
- **Rule hardening:** Firestore's string `.size()` counted characters, while the JavaScript guard counts UTF-8 bytes. The new security rule uses `.toUtf8().size()`, matching the client. **Publish this updated `firestore.rules` in Firebase Console before merging/deploying v98.2**; the repository does not publish rules.
- **Regression coverage:** new byte-count and non-ASCII tests, three section size-meter UI checks, transitive cloud/Health offline asset checks, and the existing full model/UI/Firestore emulator suite. Actual Firebase sessions, WebKit background behavior, and account contents still require real-device validation.
- **Storage caveat:** the 800 KB value is an application safety margin below Firestore's 1 MiB per-document maximum, not a Google storage quota or total account cap. Separate device-local recovery/confirmed copies may encounter browser quota or eviction limits independently; retain complete downloadable JSON backups.

## Run

Requires Node.js 20 or newer. No packages or accounts are needed.

```sh
npm run dev
```

Open http://127.0.0.1:4173. Run `npm test` for the data-model checks. To install as an iPhone Home Screen app, serve this folder over HTTPS, open it in Safari, and use Share → Add to Home Screen. The service worker caches the app for offline use after its first load. The app requests persistent origin storage when supported and shows the granted/best-effort status in Settings → Offline protection.

## Online version checks and offline operation (v60)

Every launch and return to the foreground checks `version.json` directly over the network (with caching disabled). When the published version is newer, Everyday refreshes to the latest app after active forms, workouts, imports, cloud saves, and offline workspaces are safely out of the way. A compact refresh notice appears if the update must wait. The check never blocks loading and network failures are ignored, so the already installed app remains usable without a connection.

The service worker uses network-first navigation when online, but its fully precached release when offline. Release metadata is not cached. Update `version.json`, asset references, and the service worker's cache name together when publishing a new version.

## What is included

- Daily calorie and protein totals with editable goals (initially 1,600 calories and 130 g protein), plus a Progress chart that can move through weekly, monthly, quarterly, and yearly views.
- Once-per-tracking-day automatic weigh-in prompt: once it has appeared, Everyday will not automatically ask again until the next tracking day.
- Saved Food cards open a prefilled food-log form for fast quantity/date/time changes, with a five-second Undo after saving. New manual foods default to **Save as new food**, which can be unchecked for one-off entries that should stay out of the reusable Food Library. Each log stores its own calorie/protein values so editing a saved definition does not rewrite history.
- Universal additive CSV import from files or pasted text, with preview and validation, plus pasted/file JSON backup restore.
- Upper, lower, and full-body starter exercise lists, custom exercises, sets/reps/weight, difficulty, notes, and canonicalized last-time reference so legacy aliases such as `Dumbbell Lateral Raise` resolve to the current exercise.
- Independent weight and body-fat records, individual BMI, separate weight/body-fat charts, and Friday-start weekly average weight/BMI. Height starts at 68 inches and is editable.
- Google sign-in with private Firestore account storage, save status, conflict protection, and explicit migration from device logs. While signed in, the app also keeps an account-scoped last-confirmed device copy plus an unsaved recovery copy so an iOS process refresh or temporary network loss does not depend on RAM. Conflicting cloud/device revisions are never overwritten automatically. Explicit sign-out clears those account-specific local copies. Device-only mode remains available. See FIREBASE_SETUP.md before enabling cloud accounts. Export JSON regularly for an independent backup.

## Food dates and tracking days (v59)

A food entry's `date` is the actual calendar date eaten, and optional `t` is the local clock time in 30-minute slots (0–47). The site uses `settings.dayResetMinutes` to calculate which tracking day receives it. An entry with no time counts toward its calendar date, because the time is unknown. Changing the reset setting regroups timestamped entries without changing their stored dates.

**No automatic migration:** backups made through v58 may use tracking dates rather than actual calendar dates for early-morning foods. Preserve your old JSON and manually correct the affected dates before relying on historical totals in v59. CSV food dates follow the new actual-date convention.

## CSV format

CSV is an additive interchange format for normal user-editable Everyday data. It can be uploaded as a file or pasted directly into More → Import & backup → Import data. Every CSV goes through the same preview before it can be committed.

For new universal CSVs, include a `recordType` column. One CSV may mix record types. Blank columns are allowed when they do not apply to that row.

Supported record types:

| recordType | Main fields |
| --- | --- |
| `savedFood` | `name,calories,protein,kind,tags,favorite,accuracy,lastUsed` |
| `foodLog` | `date,name,calories,protein,quantity,time,saveAsFood` |
| `exercise` | `exercise,equipment,setup` |
| `workout` | `workout,exercise,equipment,order,repMin,repMax,targetSets,restSeconds` |
| `lift` | `date,exercise,equipment,group,set,weight,reps,effort,notes` |
| `weight` | `date,weight` |
| `bodyFat` | `date,bodyFatPercent` |
| `note` / `dayNote` / `mealNote` | `date,noteType,text,time` |

Workout rows with the same `workout` name are assembled into one template and ordered by `order`. Lift rows with the same `group` are assembled into one lift entry with multiple sets. Dates use `YYYY-MM-DD`. Food time may be a half-hour slot number (0–47) or `HH:MM` on a 30-minute boundary. Tags may be separated by `|` or `;`. For `foodLog`, `saveAsFood` defaults to `true`; set it to `false` for a one-off log that should remain out of the reusable Food Library. The import preview groups food logs by date and shows the Food Library effect on each row instead of exposing auto-created dictionary records as separate changes.

Example mixed CSV:

```csv
recordType,date,name,calories,protein,quantity,time,saveAsFood,exercise,equipment,workout,order,repMin,repMax,targetSets,restSeconds,group,set,weight,reps,effort,notes,bodyFatPercent,kind,tags,favorite,accuracy
savedFood,,Core Power Elite 42g,230,42,,,,,,,,,,,,,,,,,,,food,protein|drink,true,label
foodLog,2026-10-02,Core Power Elite 42g,230,42,1,14:30,true,,,,,,,,,,,,,,,,,,,
exercise,,,,,,,,Chest Press,machine,,,,,,,,,,,,,,,,,
workout,,,,,,,,Chest Press,machine,Upper,1,6,12,2,90,,,,,,,,,,,
lift,2026-10-02,,,,,,,Chest Press,machine,,,,,,,upper-press,1,60,10,4,,,,,,
lift,2026-10-02,,,,,,,Chest Press,machine,,,,,,,upper-press,2,60,8,5,,,,,,
weight,2026-10-02,,,,,,,,,,,,,,,,,181.5,,,,,,,,
bodyFat,2026-10-02,,,,,,,,,,,,,,,,,,,,,22.4,,,,
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

The Shortcut may submit the latest weight, the latest Body Fat Percentage, or both. Everyday stores them as independent record types with independent dates and timestamps. The bridge accepts either Health-style fractional body-fat values such as `0.224` or display-style `22.4` and stores `22.4%`.

Before enabling it, publish the complete `firestore.rules` in the Firebase console. The additional paths are:

- `/users/{uid}/integrations/appleHealth`: owner-only connection token, processed weight/body-fat timestamps, and last result. Secrets stay outside backups.
- `/weightBridges/{256-bit-random-token}`: owner UID and one bounded pending sample. Possession of the random URL permits replacing `sample` only; it does not permit reading fitness records or changing the owner.

Treat the Shortcut URL as a bearer secret. Disconnect revokes it and creates a new token on reconnect. No administrator or Google credentials belong in Shortcuts.

`health-model.js` validates weight and body-fat streams independently, including their own dates, timestamps, units, and conflict policy. Manual readings remain authoritative over Apple Health readings of the same type/date. Weight and body-fat processed timestamps are tracked independently so repeated or older samples in one stream do not block a fresh measurement in the other.

`health-cloud.js` imports measurements and acknowledges their processed timestamps in a Firestore transaction. Failed or conflicting writes do not partially acknowledge data. Historical Health backfill and Health deletion mirroring remain out of scope.

Verification targets are `npm test`, `npm run test:ui`, and `npm run test:rules` (Java 21+ for the Firestore emulator). A real-iPhone end-to-end check is still required after publishing the updated rules and editing the Shortcut because desktop tests cannot grant Health permissions.

## Logging refinements (v61)

Food forms offer half-serving step controls and quick ½, 1, and 2 serving presets. A per-entry CSV toggle displays the current foodLog header/row or accepts one CSV food row to fill the form, without saving until confirmation. Quarterly/yearly nutrition averages omit recorded days below 1,000 calories; raw entries and day-level charts are unchanged. The Progress exercise-list modal follows the visual viewport on iPhone.

## Workout Buddy refinements (v62)

Buddy preserves its current look but switches to a focused in-set display with weight, reps, and a live set timer. Finish Set preserves the completed set immediately, then opens a post-set review during the rest countdown for corrections to weight, reps and perceived effort. Confirm advances to the next set or exercise. The exercise screen shows the last two sets, expandable recent sessions, a dated exercise journal, and quick editing of the persistent setup note. The circuit stores performed order separately from template order and offers the previous performed sequence next time. Machine/dumbbell/cable cards have subtle distinct accents; push/pull indicators use a name-based heuristic and are not an anatomical classification.

## Fixed demo dataset (v63)

When signed out, Home and More provide **Load demo data**. This loads a fully fictional, deterministic 42-day notebook with saved foods, dated food entries (including a post-midnight entry), weigh-ins, body-fat readings, notes, lifting history, and completed Workout Buddy sessions. The sample uses fixed dates and values, not random input or real user data. Demo editing/reloading saves to the separate `everyday-demo-workspace-v1` browser key; **Reset demo data** restores the same original sample. **Exit demo** clears the demo workspace and returns to the original device logs. No demo data is copied into Firebase or the device's normal storage. Sign in and offline JSON workspace mode are unavailable until exiting demo. An already signed-in cloud account takes precedence at startup.

## Workout Buddy refinements (v64)

After a set, its result stays editable and does not appear in Completed Sets until review ends. **Start set** saves edited values and immediately starts the next set's timer; the final set uses **Next exercise**. Tapping the last workout's two-set summary expands in place to show the preceding two sessions. The existing Setup pill is tap-editable and appears even when empty, with Journal inline next to it. Exercise-picker cards now show dedicated colored push/pull corner badges.

## Shared exercise cards and viewport polish (v65)

Lifting, Workout Buddy picker, Exercise Library, and Progress use the same `exerciseCardMarkup` component. Equipment colors are shared; push/pull colors appear as translucent gradients strongest at the top-right corner, fading into the card, with small text indicators. Exercise Journal moved into the Notes area. The rest countdown is hidden during the final-set review. Workout Buddy's content scrolls on short screens instead of clipping at the bottom, and the main action remains available.

## Exercise-card consistency (v66)

The workout Add exercise picker now uses the same exerciseCardMarkup renderer as the other five exercise-card surfaces. Editable workout template rows retain their inputs but use the same push/pull classification and soft corner-to-card gradient, keeping all exercise displays visually coherent.

## Entry time controls and Google sync meter (v67)

Food entries, food suggestions, and reset-time settings now use one shared 30-minute ± time control instead of dropdowns. Optional time values have Now and No time shortcuts; the stored time format and selected calendar dates are unchanged. Time wraps within the selected date. The Google sync payload meter is placed directly after the Account section in Settings, showing estimated encoded notebook data against the 800,000-byte (~781 KiB) Firestore payload budget—not device storage or the overall Google account quota. A separate diagnostics section retains integrity checks.

## v68 — Simplification and true chronology

Cruise Mode and associated day/travel/meal-memory notes have been removed from the app and backup payload. Old JSON backups still load, but retired fields are discarded. Food logs sort by actual date/time, newest first, while untimed entries come last. The 30-minute time buttons now roll the real calendar date across midnight, independently of the configured tracking-day reset. Meal suggestions display the chosen calendar date and use the same rollover behavior.

## v69 — Batch food logging and less intrusive suggestions

Choose **Add another food** to stage the current entry and immediately enter the next. The compact queue can be edited by removal and is only saved on **Save foods**. Untimed entries appear above timed entries. **Suggest rest of day** no longer shows date/time controls: tapping Add stages its recommendations in the regular food form for final date/time selection and confirmation.

## v70 — Routine management, first pass

Lifting now includes a **+ Manage** routine library with Use, Edit and Copy. **Create routine** offers Blank, Upper body, Lower body, Full body, Push day, Pull day and Leg day starter frameworks using the canonical Exercise Library and existing sets/reps/rest editor. Routines can be renamed during editing, and duplicates receive new IDs. A new or duplicate routine is only saved on confirmation. Past workout records and any in-progress session remain unchanged. Empty routines cannot be started in Workout Buddy. Routine archiving and scheduling are reserved for later.

## v71 — Routine editor refinement

The routine Add exercise picker now has **+ New exercise**, which opens the same canonical Exercise Library editor used elsewhere. When saved, the new exercise is added to the unsaved routine draft, and its program settings can be edited normally. **My routines** now shows Edit, Copy and Delete; redundant Use was removed (select routines using Lifting tabs). Delete requires a 3-second countdown, never deletes saved lifting history, and can be undone from My routines during the current browser tab session. If an active workout uses a routine, deletion is blocked until the session is ended. Deleting the last routine does not recreate the defaults; **+ Create routine** remains available.

## v72 — Body-map muscle reference

Workout exercise cards, Workout Buddy's picker and its exercise screen, routine editor rows, and exercise Progress each link to the same locally rendered front/back muscle guide. A compact schematic highlights primary muscle groups in terracotta and secondary groups in blue, with labels and a clear note on anatomical limits. The first pass maps the built-in exercises and several common names; unfamiliar custom exercises show no assumed highlights. Diagrams contain no external image dependency, are cached for offline use, and never modify workout logs or session timing.

**Buddy overlay fix:** The muscle guide opens as a dedicated Workout Buddy subview, not a regular modal hidden under the full-screen workout. Back returns to the exact active workout, and elapsed time still derives from original timestamps.

### v72.1 cache refresh

The Workout Buddy guide fix also gets a new service-worker cache key and JS/CSS revision. This ensures devices that loaded the first v72 package fetch the corrected full-screen guide.

## v73 — Mini muscle diagrams and completed routine history

Lifting and Workout Buddy exercise cards now show tappable thumbnail front/back muscle highlights instead of the text Muscles button. A consistent miniature beside the exercise name appears before and during active sets in Workout Buddy and in the routine editor. The Lifting page replaces the selected day's individual lift list with the latest three completed Workout Buddy sessions; View all opens the archive, and each entry exposes original sets. Manual lift history remains available elsewhere. Session snapshots persist independently of renamed/deleted routines.

### v73.1: Routine history now shows the actual calendar date from session completion or end timestamp, retaining tracking-day data unchanged internally.

### v73.2: Context-aware routine history navigation

Tapping one of the three Recent routines on Lifting opens its detail directly and closing returns to Lifting. Opening the same routine through **View all** returns to the full routine-history list when closing detail. The full list then closes back to Lifting. No workout data or saved sessions are changed.

### v73.3: Fixed-position muscle mini and understated movement labels

Workout Buddy's miniature anatomy guide is anchored to the same coordinates in set preparation and active-set views; it no longer inherits their differing exercise-heading margins. A muted inline Push/Pull label appears beside equipment in canonical exercise cards and the Buddy heading without crowding the right-corner muscle view. Existing gradient movement tint remains. SVG redesign exploration and the other recovered feedback are deferred.

### v74: Clear muscle-legend squares and no Buddy diagram overlap

The Primary and Secondary legend indicators now match their rendered class names and display consistently sized terracotta/orange and blue squares. Workout Buddy retains its fixed anatomy thumbnail position between set preparation and active sets, but reserves a vertical header area so the prior-session history and active weight/reps cards cannot sit underneath it. The previous v73.3 Push/Pull labels remain intact. SVG anatomy artwork itself is unchanged; alternative designs are deferred to a separate comparison pass.

### v75: Undo transitions, per-set defaults, working muscle groups, and saved-set corrections

Workout Buddy can undo Bike finished and Start exercise, and exposes its existing Start set undo while a set is active. Undo restores the warm-up completion flag and exercise performance order. On the next session, each set starts from the matching set index in the latest prior log, falling back to earlier/current weights only when that index is unavailable. Pressing Enter in the persistent setup editor saves it. Muscle-group chips open group descriptions and mapped related exercises in both Workout Buddy and the regular muscle guide. Saved Workout Buddy history has a per-set Edit control for correcting weight, reps, and perceived effort; saving updates both the historical session and its associated lift log. No workout records were modified by the release itself.

### v76: Chronological routine history and shared exercise editing

Saved Workout Buddy session detail now displays exercises by the first recorded set start time; if timestamps are missing, it falls back to the session's performedOrder and then stored order. History rendering preserves source indices rather than rewriting history. Each completed exercise has one Edit action at its card's upper-right corner. That editor uses the same extracted weight/reps +/- controls and seven-level effort selector as live Workout Buddy, with set tabs and editable exercise notes. Changes are drafted locally across tabs and committed together; Cancel returns without changing saved sets. Saving updates the saved session and corresponding linked lift record while retaining set timestamps and duration.

### v77: Complete lb/kg weight conversion (Pass 1.3)

Switching weight units in Settings now converts the complete notebook transactionally, not only weigh-ins and ordinary lift logs. The same conversion covers active Workout Buddy completed sets, the unsaved next-set draft, its saved undo snapshot, and every saved routine session and any retained undo copies. Weight in the linked lift log and the original archived session stays consistent. Repetitions, perceived effort, notes, body-fat percentages, exercise order, dates, set durations and timestamps are unaffected. If an invalid weight is found, conversion is rejected without changing the existing notebook. The conversion is not rerun when the selected unit is unchanged. Small rounding differences (0.1-unit precision) can accumulate if switching back and forth repeatedly; conversion does not regenerate old historical values from mirrored records.

### v78: Previewed, non-destructive device-to-cloud migration (Pass 1.4)

**Review & copy device notebook** replaces the old one-tap transfer. It previews additions and skips for food, ordinary lifts, weigh-ins, body fat, custom exercise definitions, routine templates and saved Workout Buddy sessions, plus the active-workout disposition. The original device JSON can be exported from the preview. Different live sessions on device and cloud halt migration rather than overwriting either one. Custom exercises are matched by name and equipment and their references remapped; routine variants receive distinct IDs and names; Workout Buddy history collisions also receive distinct IDs, retaining the association of mirrored lift logs. The cloud version of colliding food and weigh-in records wins as before. Matching exercise setup values prioritize the cloud; divergent setups are flagged for review, and the original device copy remains available. All incoming workout weights are converted to the cloud unit, including active drafts and undo snapshots. The candidate is normalized and checked against the Firestore payload limit before any write. Final confirmation checks the same account, cloud revision and notebook copies that were previewed; invalidated previews must be reopened. Repeat imports are safe; actual cloud saving uses the pre-existing revision conflict protection.

### v79: Complete migration review availability and setup-preview accuracy

The new Review & copy device notebook action remains available to accounts that used the older migration flow; the previous completion flag no longer hides workout records that earlier releases failed to copy. The preview includes exercise setups being filled into empty cloud fields, in addition to added records, while showing a warning for conflicting setup notes retained in the original device backup. The final assets and cache revision are synchronized for offline update delivery.

## v81 — Finances navigation foundation (Pass 3.1)

The bottom navigation now shows Home, Food, Lifting, Progress, and Finances. Settings is available from the compact gear beside the date in the top header on Home and all other main pages. Finances is an explicitly empty foundation for future transaction logging; it does not record transactions, connect to a bank, or modify any notebook data. Existing cloud and offline features are unchanged.


## v82 — Financial transaction storage foundation (Pass 3.2)

Finances now has a durable transaction collection in the Everyday notebook; purchase logging and spending UI follow in later passes. Device-only and cloud accounts, offline JSON workspaces, cloud recovery copies, version-2 compact JSON encoding, full JSON backup/restore, and reviewed device-to-cloud migration retain the collection without interfering with food or workouts. Older version-1 and version-2 backups lacking transactions safely load with an empty list. A full JSON restore still replaces the whole notebook and explicitly previews financial records that would be removed.

Each transaction has fields id, date, kind, amountCents, description, category, currency (USD), and optional time, merchant, note, source, externalId. Date is the actual local YYYY-MM-DD calendar date rather than the food tracking day; time may be HH:MM or omitted. Kind is expense, income or transfer; amountCents is a positive safe integer, preventing floating-point dollar rounding. Category defaults to Uncategorized and source may be manual or import. No bank credentials, account numbers, or inferred balances are stored. Validation rejects invalid amounts, unsupported currencies/types, malformed dates/times, duplicate IDs and excessive text.

Cloud migration previews report financial additions/skips, preserve distinct same-amount purchases, and assign a safe new ID when a cloud/device ID collides. Replaying the same migration doesn't duplicate a transaction. CSV transaction import is intentionally not enabled until the review/deduplication pass.


## v83 — Quick transaction logging and ChatGPT prepared CSV batches (Pass 3.3)

Finances is now usable. On the Finances tab, Quick Log puts amount and description first, with an expandable Type (expense/income/transfer), Category, actual calendar Date, optional Time, Merchant, and Note section. Each entry uses the validated positive USD integer-cent model from v82 and is saved through Everyday's device, cloud/recovery, offline workspace, or demo workflow. The ten newest transactions are visible, editable and deletable; full searchable history and spending summaries remain future phases.

**Bank screenshot workflow:** Share one or more bank screenshots or a CSV with ChatGPT; ask it to convert the transactions into the Everyday format below. In Finances, choose **Paste prepared CSV**, paste the result, preview the proposed rows, and confirm only after reviewing all dates, amounts, and expense/income/transfer types. Screenshots are supplied to ChatGPT, not uploaded into the Everyday app. CSV amounts are positive dollars; direction belongs in the kind column.

```csv
recordType,date,time,kind,amount,description,category,merchant,note,externalId
transaction,2026-10-27,14:15,expense,7.19,Water cases,Household Supplies,Wawa,,
transaction,2026-10-27,,income,100.00,Paycheck,Income,,,
```

Use YYYY-MM-DD calendar dates and optional 24-hour HH:MM times. Add a unique transaction reference to `externalId` when the bank provides one. The reviewed CSV importer supports `transaction` (also `expense`, `income`, `transfer` aliases) in universal Everyday CSV, and an alternative `amountCents` exact-integer column. It rejects signed/ambiguous amounts rather than guessing bank debit/credit conventions. Reimporting the same prepared CSV recognizes stable content-based IDs and does not create new entries, including preserving multiple identical purchases within one batch by occurrence number. If a different row resembles a preexisting manual purchase, it receives a visible duplicate warning but is not silently discarded. Conflicting transaction IDs block the whole candidate. Editing a transaction retains its ID. Imported entries can be corrected or deleted individually.

**Direct Bank of America CSV import is supported** (checking/savings and common card layouts). Other banks are not automatically recognized; convert those exports to Everyday's reviewed CSV format first. Always preview classification and omit sensitive account numbers or banking credentials when sharing files.


## v84 — Bank of America imports, source-aware names, and ChatGPT clarification loop

This is a dedicated finance pass before transaction-history development. In **Finances → Bank statements**, use **Import bank CSV**, assign an **Account label** (for example, BofA Checking) and a **Statement / batch label** (for example, October 2026 Checking), select the original Bank of America .csv download, review every proposed change, and confirm. The parser scans past the account summary preamble to find the real `Date,Description,Amount` or `Posted Date,Payee,Amount` transaction table, supports signed dollars and quoted thousands, handles checking/savings and common card CSV layouts, and skips balance-only rows. Negative amounts are interpreted as expenses, positive amounts as income, and clearly transfer-related descriptions as transfers with a review warning. It never connects to online banking. Posted bank dates and amounts are distinct from actual receipt purchase date/time. Large CSVs and invalid rows are rejected rather than partially applied.

Each bank record stores the **unchanged bank-provided description** in `bankDescription`, a user-friendly `description`, the free-text `accountLabel` and `statementLabel`, the original posted date and amount, plus optional `category`, `subcategory`, `merchant`, `note`, `purchaseDate`, `time`, and `itemization`. The app displays the **personal description** in the main title, with **Bank: [unchanged statement description]** below in smaller muted text. Account and statement labels are also visible in the transaction metadata and import preview. Bank facts are read-only in the bank entry editor. Editing a personal label does not rewrite the bank description.

**Bank statement → ChatGPT → Everyday workflow:** Import the bank CSV into Everyday; send the same bank export and any photos of receipts/items to ChatGPT. Export **Finances → Export for ChatGPT** from Everyday to get a ready-to-edit CSV carrying the ledger's exact stable IDs and immutable bank facts. Ask ChatGPT to provide a completed enrichment CSV in the same column order. Paste it using **Finances → Paste clarifications**; the importer validates every target ID, checks supplied posted dates/amounts/account labels/original descriptions, previews modifications, and updates existing entries *in place*. It will not create new transactions or change original bank facts. Blank enhancement fields mean "leave unchanged". The app does not extract text from receipt photos directly; users share the photos with ChatGPT. No account number or bank password is required.

Example enrichment CSV header:

```csv
recordType,id,postedDate,kind,amountCents,bankDescription,accountLabel,statementLabel,description,category,subcategory,merchant,note,purchaseDate,time,itemization
```

Keep record IDs unchanged. Use a separate `purchaseDate` for receipt dates differing from the posted date, `time` for receipt HH:MM, and `itemization` for a human-readable breakdown. For classifications, `category` can be broad (e.g. Convenience Food) and `subcategory` more specific (e.g. Energy Drinks); uncertainty belongs in a note rather than a fabricated item total. The original bank amount does not change when a receipt is itemized. Imported data remains in the user's existing offline/JSON/cloud notebook and backup system.

**Duplicate safeguards:** Bank identities use account label, posted date, original description, signed amount, bank reference or running balance (when present), and a fallback same-record occurrence. Changing the batch label does not change identity, so overlapping reexports skip known bank IDs while preserving user labels. Similar existing manual entries are shown as possible duplicates instead of silently merged. For exports without running balances/references, identical charges in overlapping partial exports may be ambiguous and deserve manual review.

**Privacy:** Avoid uploading full account numbers, personal routing information, or sign-in credentials. The generated "for ChatGPT" CSV intentionally contains your chosen account label and spending records, so share it only where you intend. Receipts and original statements are not stored by Everyday unless you explicitly supply parsed text/records. No account balances are inferred.


## v85 — Bank classification refinement

Bank of America imports now preserve `bankDirection` (original debit or credit), separate from the editable `kind` classification (expense, income or transfer). The bank editor and ID-anchored enrichment CSV can correct that classification without rewriting the original amount, posting date, bank description or direction. Reimporting an overlapping statement keeps the corrected type and personal labels. The bank import also supports `Post Date` column variants and zero-value running balances. The v84 Bank of America and ChatGPT round-trip workflow remains otherwise unchanged.


## v86 — Bank of America $0.00 status-notice handling

The direct Bank of America CSV reader now skips zero-dollar bank notices (including `KEEP THE CHANGE TRANSFER CANCELED-LOW ACCT BALANCE`) instead of rejecting the entire statement. Because those rows represent no movement of money, they are not saved as transactions. Import review counts them explicitly; unrecognized $0.00 row descriptions are flagged in a warning. Transfer-classification warnings are summarized rather than producing dozens of near-identical alerts. The August 3–October 27, 2026 checking export with 478 genuine transactions and 3 canceled $0.00 transfer status rows is now covered in the regression tests. Normal manual entries still require strictly positive amounts. No existing transaction amounts, bank descriptions, or saved notebook data are altered.


## v87 — Automatic Bank of America statement/batch labels

In **Finances → Import bank CSV**, the **Statement / batch label** field is now automatically suggested when a Bank of America statement is selected. Everyday reads the actual beginning/ending balance dates in the CSV preamble, or falls back to the range of posted transaction dates. For example, the user's August 3–October 27, 2026 export receives **Aug 3 – Oct 27, 2026**. Single-month and cross-year ranges receive readable date labels. The field remains editable for a custom name, and file changes never replace a manually entered name. If the iPhone picker does not emit its change event before submission, the importer infers a label again during Preview. When no valid dates exist, the user receives a clear request to enter a manual label. The account label remains separate and user-defined; bank identity/deduplication continues to be independent of statement/batch labels. No transactions are added until preview confirmation.

 
## v88 — Finance import reliability

Bank of America imports recognize explicit **Discover E-PAYMENT**, **Online Scheduled Payment to ACCT#**, and **OVERDRAFT PROTECTION FROM** entries as transfers rather than ordinary consumption/earned income. Savings transfers continue to use the original transfer classification, and recognized transfers get clear subcategories (Debt payments, Overdraft protection, Savings transfers, or Other transfers). Original bank debit/credit directions, amounts, dates, decoded bank descriptions, and IDs remain protected. Bank notices with no movement remain excluded.

**Ambiguous person-to-person payments:** Zelle/Venmo/etc. descriptions do not automatically imply a non-spending transfer. They remain debit-to-expense or credit-to-income by default and receive a grouped review warning. Assign the correct category/type based on what the payment was for (purchase, shared expense, reimbursement, gift, or own-account transfer).

**Duplicate review:** Reimporting the same account/file with the same account label still skips exact IDs. A classification change does not conceal a similar previously logged transaction. When an imported row resembles one saved under a different account label, the importer flags it and summarizes the count, but never merges rows across account labels automatically. Account labels are human-entered metadata, not verified bank account identities; changing labels for the same account between imports requires review. Ambiguous matching rows stay visible in Preview.

This is classification at **import time**, not a migration of existing ledgers. Previously imported records remain untouched, including personalized categories and notes. The actual private bank export is **not committed to the public repository**; unit tests use synthetic examples of its relevant formats.


## v89 — Reliable iOS resume logging and concise transaction rows

Ordinary Food, Finance, workout, and measurement form submissions no longer silently fail when an iOS background/foreground transition leaves a cloud save pending or busy. They use the existing device recovery journal first; cloud-sync status remains visible if cloud saving is incomplete. On foreground resume, the app retries an unconfirmed save when safe. During a competing Health pull, locally recorded edits are never silently replaced by the Health response; a genuine cloud/device conflict requires review. Full statement/backup imports still require a synchronized account and display an explicit form error rather than silently ignoring a submit.

Finance **Recent transactions** presents the muted posted date above the main personal transaction name, an original bank description in quiet text only when it differs from the personal name, and a category/subcategory only when classified. No "Uncategorized", repeated bank text, account label, or statement/batch range is shown in the compact list. Bank facts and account/source metadata remain available in the transaction editor and stored backup.

This release does not retroactively rewrite previously imported transaction categories. Reconciliation of older classifications remains a separate, reviewed enrichment step.

 
## v95 — Workout Buddy interruption safety and next-cycle handoff

An unfinished Workout Buddy **Setup** edit is now journaled as a recoverable `setupDraft` in the active workout on typing and on lifecycle interruption (background, pagehide, or exit). Reopening the active workout restores the draft in the editor. **Only explicitly pressing Save** commits that draft to the exercise and its saved definition; tapping Setup again to close cancels the draft. This closes the remaining v94 keyboard-editing data-loss gap without modifying saved lift history, other exercise definitions, or finance records.

Added a regression check ensuring `version.json`, the HTML's asset query revisions, the service-worker cache/precache, production JS module references and app SW registration stay aligned. The check also detected and corrected an existing offline asset mismatch: the app referenced `demo-mode.js?v=72` while the service worker had cached `demo-mode.js?v=85`; both now request the v85 asset. Extended UI smoke testing for the interrupted edit/reopen/cancel sequence and normal Save semantics. No migrations or changes to the existing recovery model.

**v95 finishes the v91–v95 release-number cycle.** The detailed handoff for **v96–v100** lives in `PROJECT_CONTEXT.md`. Real-device checks of v89 resume, v90/v91 Finance History, v92–v94 Workout Buddy scroll/zoom/keyboard behavior, and application of the previously prepared nine-row bank enrichment file remain unconfirmed until tested or reported by the user.

## v94 — iPhone keyboard and Setup editing

Workout Buddy's **Setup** chip now opens an editable text field and **focuses/selects it synchronously in the same tap** rather than waiting for persistence first, so iOS can present its keyboard without requiring a second tap. The Notes editor likewise focuses in the originating tap. Both retain their normal save/dismiss actions; pressing Return on Setup still saves.

While a Workout Buddy input is focused, the fixed set screen follows the smaller iOS `visualViewport` height and vertical offset. The existing v93 contained-scroll fallback keeps a focused field accessible above the software keyboard; after leaving the editor, the screen returns to its normal full-height/no-scroll presentation. Setup, Notes and archived workout text inputs use 16px text (numeric set inputs remain larger), avoiding iOS Safari's usual focus-zoom trigger without disabling manual pinch zoom or changing the global viewport meta tag.

No existing workout, food, finance, bank identifiers, or cloud/local recovery formats were altered. Automated DOM tests verify synchronous focus, edited values and simulated viewport behavior; **the iPhone Home Screen PWA must still confirm actual keyboard/zoom behavior on-device**.

## v93 — Viewport-fitted Workout Buddy set screens

Regular first- and later-set screens now use a compact fixed-height layout with **no vertical page scrolling** when the controls fit the available viewport. Spacing around the stationary anatomy diagram, previous history, resting clock, completed-set summary, numeric steppers, effort controls, notes and primary action was reduced without removing functionality. The Start/Finish/Next button remains at the bottom but no longer uses the old sticky-scrolling layout during ordinary use.

Expanded previous-workout history opens as a small, independently scrollable dropdown rather than pushing the set editor offscreen; the user can close it using the same history toggle. In an unusually short browser viewport, larger accessibility font setting, or when expanded editing needs more height, a measured **contained-scroll fallback** activates instead of clipping controls. The exercise picker and Journal intentionally retain their separate scrolling behavior.

The exact no-scroll appearance still needs confirmation in the user's iPhone Home Screen PWA. v94 remains the separate iOS keyboard/focus/zoom release.

## v92 — Workout Buddy current-set inheritance and contextual undo

Set 2 and later initialize weight, reps, and effort from the **most recently completed set of the same exercise in the active workout**, including corrections made during set review. Only the first set (or an exercise with no current completed set) uses previous-workout values as a fallback. Explicit edits to a draft remain authoritative and are preserved by the existing local/cloud recovery path.

Undo links are now shown and accepted only for the transition that produced the current screen: start set while active, finish set while reviewing, next set while active, exercise completion from picker/complete, and other immediate transitions. Leaving the exercise using Back clears stale undo snapshots rather than offering an old action later. Undo continues to restore the precise prior session state and any Workout Buddy lift records without changing historical lifts unrelated to the session.

The no-scroll Workout Buddy redesign (v93) and iOS keyboard/zoom improvements (v94) remain **separate planned releases**, not part of v92.

## v91 — Finance classification review queue (non-destructive)

Finances offers **Review classifications** when saved records need attention. Transaction History can filter by **Needs review**, **Uncategorized**, or **Possible transfers**. The possible-transfer hints reuse Bank of America's explicit payment and overdraft-transfer wording rules and can identify older imported records with mismatched editable types. Hints need human verification; peer-to-peer payments are never assumed to be transfers. Existing Edit updates a specific transaction and preserves immutable bank facts, stable IDs, receipts, notes and cloud recovery.

This release makes no migration or new stored fields. It does not apply the nine-row enrichment file. iOS app-switching and history still need real-device confirmation.

## v90 — Full Finance Transaction History and living development handoff

Finances → **View all transactions** now opens a full history view of the saved financial ledger instead of only ten recent entries. Search considers the personal description, original bank description, merchant, category/subcategory, notes, itemization, dates and amount. Filter by **expense/income/transfer**, posted month and category; sort newest or oldest first. Results load in groups of 50 to keep the mobile page responsive. The entry card retains the v89 visual hierarchy: small muted posted date, personal name, optional distinct bank source, optional meaningful category, amount and Edit. Editing from the history updates the same stored transaction; navigation returns to the Finances tab without duplicating data. Filtering and scrolling do not mutate transaction records, classifications or source facts.

**Conversation continuity:** `PROJECT_CONTEXT.md` is the canonical summary of active version, technical architecture, delivered releases, unresolved bugs, cautious financial classification rules, roadmap candidates and deployment workflow. New ChatGPT conversations should start by reading it and checking live GitHub state; rotate after each five-number release cycle (next **v91–v95**). Update the context file when completing each new version. Privacy: do not put original personal statements, receipt images, transaction-level private CSVs, API keys or account information in this public repository.
