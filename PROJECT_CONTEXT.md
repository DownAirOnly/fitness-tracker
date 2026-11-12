# Everyday — project context and conversation handoff

> **Read this file first in every new Everyday development conversation.** This is the living project handoff, not an implementation spec or a substitute for inspecting code. Check `version.json` and recent commits to confirm the current release before editing. Update this document when completing each version and before moving to a new conversation.

## Current release — v142 (November 12, 2026)

- **Food-log visual cleanup:** On the **Log saved food** form, hide the large visible modal heading while retaining the descriptive dialog label for accessibility and the existing Close button. Other food form titles (Add food, Edit food log) remain.
- **Matched dark input surfaces:** Food name, calorie, protein and date text-entry controls use the same palette-derived deep background as the central Time display. No hardcoded theme colors; editing, keyboard and date behavior unchanged.
- **Equal bottom actions:** Add another food and Save / Save foods use two equal grid columns on new/saved-food forms, with wrapped labels permitted on narrow screens. Edit/delete dialogs retain their original action layout.
- **Safety and regression:** Authentication gating still blocks premature saves. Versioned PWA assets and transitive imports advance to v142; automated tests and physical iPhone verification are distinct milestones.

## Previous release — v141 (November 12, 2026)

- **Compact Food Entry:** The submit action reads **Save** (instead of Save food log). The pre-auth account-checking hint and the redundant bottom explanation about saved foods/JSON backups are removed. The **Now** and **No time** shortcuts move onto the Time label row, above the existing 30-minute stepper, scoped to Food Entry only.
- **Safety preserved:** Cached saved-food cards can still open before account authentication, and their Save button stays disabled until account identity and notebook load are confirmed. The removed hint is only presentation; same-owner hydration and form preservation remain intact. Batch saves retain their descriptive **Save foods** label.
- **Regression:** Updated the focused startup preview assertion for no pending message and the shorter Save label. Versioned assets and service worker advance to v141; device verification is separate from code changes.

## Previous release — v140 (November 12, 2026)

- **Immediate cached Food-card preview:** The v139 startup fix preserved opened dialogs but pre-auth click gating still ignored taps on saved food cards until the Settings gear unlocked. If the device has a validated last-confirmed account snapshot, the main saved-food card now opens its Log saved food form immediately, even before Firebase completes authentication. Basic form controls (servings, CSV clipboard, time, close) work during this read-only preview.
- **Safe save boundary:** Until authentication confirms the cached owner and the account notebook is ready (or safely recovered), the Save food log button is disabled and a short status note explains why. Keyboard submission is also rejected during that period. Cloud completion enables Save *in place*, without replacing the form or losing typed values. A genuine user/account mismatch still dismisses the old cached form; no preview can write against another account.
- **Loading shell upgrade without repaint:** On same-owner startup, the existing Home/modal DOM stays intact. Once ready, the loading aria state, Settings icon, nav, Add button and Save state are updated directly, rather than resetting the shell. No food data schema change and no automatic logs.
- **Focused regression:** Added tests/startup-food-preview.test.js to exercise cached food first tap while Settings is disabled, prove that Save cannot write before authentication, then release delayed account load and confirm the form/servings persist and the log saves once. The existing signed-out boot and account isolation checks remain.
- **Prior v139 protections retained:** Background cloud/Health responses and app updates never forcibly dismiss an in-progress food entry.

## Previous release — v139 (November 12, 2026)

- **Startup Food Entry interruption fixed:** Cloud account loading previously called the full `render()` at the start and end of the network request, destroying any modal opened using a local snapshot and returning a user visually to the underlying page. Background hydration now keeps active modals and current pages intact whenever the user has interacted during the request, while still rendering the first usable screen if initially loading.
- **Safe same-account hydration:** A background response updates the notebook and sync indicators without recreating a visible form or discarding typed food, date, calories or protein. On genuine account-owner changes, the app still clears older owner UI instead of preserving a cross-account draft. A late load does not reset a date chosen during a user's interaction.
- **Non-disruptive updates:** New deployments no longer cause immediate automatic `location.replace` or a delayed forced reload just because version.json was updated. Instead a small update notice offers an explicit Refresh action once idle; Settings can still reload manually. Updates remain blocked while a modal, active workout or cloud save is in progress.
- **Background Health sync:** Completed Health pulls follow the same UI-preserving path instead of repainting a page after user input or navigation.
- **Regression coverage:** UI smoke artificially holds the cloud response, opens Food Entry, enters unsaved data and resumes the response; verifies identical dialog, field contents and page remain. Also checks Lifting navigation while a cloud request is delayed. No finance, Food Entry schema, or other data migrations in this release.

## Previous release — v138 (November 12, 2026)

- **Muscle diagrams repaired for imported exercises:** The existing front/back SVG now highlights named movements including Incline Chest Press, Pec Deck Fly, Reverse Pec Deck, Face Pull, Shrug, Hammer Curl, Romanian Deadlift, Hip Thrust and Back Extension; cable lateral raises map to deltoids. The importer’s detailed muscle vocabulary (e.g. rearDelts, midBack, erectors, abductors) maps only to known broad SVG groups. Stored training profiles take precedence; unknown muscle names are not invented.
- **Editable anatomy and movement:** Exercise Library → Edit exercise includes a collapsed 16-region primary/supporting/none map and a push/pull/neutral movement selector. Edits preserve imported safety and pattern notes unless explicitly revised. Push/pull fallback labels cover imported exercise names and imported movement metadata.
- **Targets visible on Lifting cards:** Every planned routine exercise shows an `N sets · min–max reps · Edit` control; the corresponding editor updates rep minimum, maximum, working-set count and rest for that routine. The same editor changes canonical equipment and shared SVG profile, with a clear warning that other routines use the shared exercise. Log lift now displays the selected routine targets and initializes sets/reps to the minimum when there is no prior lift. Historical logs and weights remain untouched.
- **Bench/Smith support:** A user may intentionally categorize their Smith incline bench press as `bench`, either in quick exercise settings or via explicitly reviewed CSV reclassification. The importer never silently changes equipment; existing ID/setup/notes are reused only on explicit choice. Historical Machine entries retain their recorded equipment; compact backups include optional historical lift-equipment overrides rather than creating unwanted duplicate definitions.
- **Import anatomy preview:** Routine CSV review includes front/back SVG muscle thumbnails and offers an explicit same-name equipment-change choice; update and schedule actions are still opt-in. Existing routine identity and personal settings remain protected.
- **Theme cleanup:** Corrected hardcoded dark-green sticky Log lift footer to use the selected appearance surface. New compact target/profile controls also use palette variables, keeping dark mode themed.
- **Import file handoff:** Updated four-day program keeps cable lateral raises in both Upper routines, changes Incline Chest Press to bench/Smith, and standardizes 8–12 main-lift or 10–16 isolation/core targets. User must explicitly confirm routine Updates and any equipment reclassification when importing; no account data is mutated by this release alone.
- **Verification:** Focused tests cover newly mapped names, imported muscle profiles, safe equipment reclassification, compact backup round-trip, and UI entry-point visibility. Automated checks and iPhone physical verification are tracked separately.

## Previous release — v137 (November 12, 2026)

- **Safe workout CSV import:** My routines → Import workout CSV, also available from Settings → Import data. Import program rows through a dedicated review screen that recognizes matching existing exercises by name+equipment and existing routines by name. Displays reusable definitions, new definitions, affected routines and imported weekday schedule before confirmation.
- **Conservative conflict handling:** Existing exercises retain canonical ID, machine setup, personal notes, historical lifts, and logged sets. Differently named exercises may be explicitly mapped to an existing exercise of the same equipment. New exercises are created only when unmatched; records of different equipment are never silently merged. Existing routines default to **Keep unchanged**; user can choose Update (retains routine ID/name/color, replaces only programmed exercise slots), or Create a copy. Importing the same program again is idempotent by default.
- **Training metadata and cues:** CSV columns movement, movementPattern, primaryMuscles, secondaryMuscles, safetyNote, setup, notes, routineCue are validated. Existing definitions may gain only missing structured training metadata; setup and shared notes never overwritten. New definitions receive imported notes/setup. Optional per-routine cues survive workout exports and compact backups. Imported movement profiles affect push/pull badges and display in Exercise Library.
- **Schedule requires opt-in:** Imported weekday mapping 0=Sun…6=Sat is previewed but ignored unless independently checked; accepting it changes only imported weekdays, leaving other scheduled days alone. Existing active sessions, completed workouts, food, money archive, preferences, and goals are not part of an import candidate.
- **Atomic preview:** A malformed file or ambiguous/dangerous mapping fails before saving. Import candidate is validated through normal notebook normalization and the usual account-safe commit path. The import model and UI smoke tests cover existing history preservation and repeated imports. Physical iPhone behavior requires user validation.

## Previous release — v136 (November 11, 2026)

- **Hotfix — restore v133 Food Entry:** Removed the v134 in-entry Calculate amount UI, preview, Apply action, and input/change listeners. The existing Food Entry form now matches v133: saved-food autofill, calorie/protein fields, servings shortcuts, date/time, copy/paste CSV, batch entry, and explicit Save.
- **Cooking remains separate:** v135 Food → Summary/Cooking workspace, recipe creation, saved ingredient snapshots, JSON import/export, and cloud persistence are unchanged. Food Library keeps optional serving metadata from v134, for cooking and future food definitions, without exposing a calculator in the ordinary Food Entry screen.
- **Data safety:** No saved foods, nutrition records, recipes, serving metadata, account identities, or lifting data changed. Existing food log entries retain their values. No schema migration.
- **Verification:** UI smoke covers absent calculator with preserved v133 serving shortcuts and food logging. Versioned assets and offline cache updated to v136. Physical iPhone UI remains user verification.

## Previous release — v135 (November 11, 2026)

- **Food → Summary / Cooking:** Two Food sub-tabs, preserving the existing food log, saved foods and food-entry editor unchanged in Summary. Cooking is a separate recipe workspace, not a fifth bottom tab.
- **Recipe core:** Create, edit and delete reusable recipes. Ingredients can be chosen from saved foods or entered manually. Each ingredient snapshots its own name, nutrition, serving details and quantity so Food Library edits never silently rewrite recipes. Batch and per-portion calories/protein are calculated live from the recipe's stated portion count.
- **Portable recipe JSON:** Export and import a single recipe with embedded ingredients. Source Food Library IDs are stripped from exported files; importing never logs food or replaces an existing recipe. No user identity or private log/financial data is included.
- **Persistence:** Recipe records round-trip through full and compact JSON, Nutrition section backups, Firebase v3 catalog documents and device migration. Older backups/cloud catalogs without recipes load with an empty recipe list. Saved recipes do not change existing eating/lifting history.
- **Scope:** This is the recipe foundation only. No food consumption is logged by saving recipes. Recoverable cooking sessions, finished batches/leftovers, explicit portion-to-Food-Entry transfer, pantry counts, and shared creator credits are next phases. iPhone layout and installed PWA behavior require real-device verification independently of automated checks.

## Previous release — v134 (November 11, 2026)

- **Food and portion foundation (phase 1):** Saved food editor has optional reference amount/unit, serving description, raw/cooked/drained/as-sold state, and known grams/milliliters equivalents. Both nutrition values always describe the same reference serving. Existing foods retain unspecified serving sizes and unchanged numeric values.
- **Calculate amount inside food logging:** Inline expandable tool previews nutrition from known quantity, desired calories, or desired protein. Apply changes only the current draft's serving multiplier; the existing Save food log action commits consumption. No modal-to-modal wizard or new bottom tab. Unit conversions are restricted to compatible dimensions or explicit equivalents; no invented density or raw/cooked conversions. Missing nutrition and zero target denominators are rejected.
- **Data preservation:** Optional serving metadata round-trips through v2 dictionary backups, section exports and account payloads. Existing log nutrition remains immutable when definitions change. CSV header unchanged; CSV remains a simple logging format, while JSON preserves serving metadata. No Firebase rule changes or new cloud entities.
- **Verification:** Targeted calculation, backup/section/account round-trip tests and the existing DOM smoke workflow include editor save/reopen, preview/apply, incompatible conversion, cancel without logging, and historical preservation. Physical iPhone appearance remains user validation. CI and Pages must be verified separately before claiming live.

### Accepted cooking direction and remaining phases

- Cooking lives **inside Food**, not a separate bottom tab. Use one editable workspace with ingredients, live batch totals and expandable instructions; no mandatory page-by-page cooking sequence. Finish batch → choose portions/optional finished weight → explicitly log consumption → retain leftovers is the desired end flow.
- Next coherent delivery: recipe core with embedded ingredient snapshots, instructions, batch totals and portable JSON. Then recoverable cooking sessions and immutable prepared batches. Saving/cooking never silently logs food or rewrites the reusable recipe.
- Recipe sharing and pantry sharing are independent opt-ins. Recipe files include a chosen sender/creator credit; importer chooses whether to display it. Keep credit in details when hidden, and exclude emails/account IDs/private pantry and logs. This is approved direction, **not implemented in v134**.
- Pantry should eventually track available ingredients and prepared leftovers, potentially shared with a brother; current mockup was only a starting point. Whether this is one shared household or independently visible supplies is still open. Do not infer shared access or send invitations.
- Fried rice anchors the future walkthrough. Do not seed unverified sample nutrition into a user's real library.
- Later phases: reviewed food database/barcode/label acquisition; selected planning/pantry behavior; informational expenditure research. No providers selected; no meal-photo interpretation promised; no automatic calorie targets, weekly rollover, coaching or lifting-program expansion.
- v134 deliberately implements the serving/portion prerequisite only. Recipe UI, portable recipe schema, actual cooking/leftovers, shared pantry access, provider integrations and expenditure are still pending. Develop one coherent phase at a time, with targeted checks.

## Previous release — v133 (November 11, 2026)

- **Money retired from Everyday UI:** Four bottom tabs only — Home, Food, Lifting, Progress. Home's Eat/Workout switch and + control use a three-column row; the Spend dashboard and Money page/subroutes are unregistered. Old saved Home dashboard preference `finances` falls back to Eat without erasing prior records.
- **Settings-only Money archive:** The existing full Finance-section JSON export survives in **Settings → Money archive**, including all transactions/bank metadata, classification rules, scheduled bills/paydays, budgets, and balance. Finance data is **not deleted by upgrading**. Export initiates a download, then exposes an *optional* erase control for that same account/data snapshot; users must check that the file is saved and Command/another replacement is verified, wait through the three-second disabled confirmation, and explicitly click to erase. Cloud deletion reuses the existing candidate-first safe-save logic so failed saves do not appear successful. No automated erasure or migration.
- **Compatibility and historical retention:** Financial data is kept in the existing account section/cloud schema until user-initiated deletion. Complete/older JSON files and legacy migration snapshots can still contain it; the reset cannot purge prior downloaded backups or Firestore rollback snapshots. This preserves existing financial recoverability while migrating to Command, whose latest fresh reconciliation, real-device and multi-device recovery checks were not yet independently verified here.
- **Scope:** No Food, lifting, body-fat, calendar, or Health changes. Replace Money UI smoke coverage with archive export/check/delete tests; keep financial model and cloud compatibility coverage as historical data safety. Android/iPhone layout and actual Downloads behavior remain device checks.

## Previous release — v132 (November 11, 2026)

- **Beginner one-to-two-set transition:** If a routine exercise is planned for one set, reviewing that first finished set offers an optional, clearly labeled **Start set 2** next to the normal **Next exercise** path. It extends only this session to two, never silently updates the saved routine target, uses existing next-set Undo, and stops after set two. Routine editor labels this **Planned sets** and explains the behavior. Routines already targeting two or more sets remain unchanged.
- **Exercise notes shared across routines:** Exercise definitions now carry an optional max-500-character **notes** property, like shared machine setup. In Buddy, notes prefill from the definition, falling back to the newest relevant historical lift note for older accounts. Notes edited in active or completed Buddy screens update the shared exercise definition, whereas existing session/lift history remains intact. Notes are directly editable in Exercise Library, too. v2 stored-data encoder/decoder and normalized backups round-trip notes, including deliberately cleared empty notes; no destructive backfill/migration.
- **Android native system UI theming:** Runtime `meta[name=theme-color]` follows the currently selected dark palette's background, including when the OS changes light/dark state, instead of reverting to default green. Manifest `theme_color` and `background_color` use a neutral charcoal fallback rather than fixed forest-green; page meta overrides when supported. **Limitation:** A static GitHub Pages manifest cannot change per account/palette, and Android Chrome/WebAPK controls the actual back/home/recents system navigation bar. Recent Android 17/Chrome versions have platform regressions; cannot guarantee live recoloring across devices.
- **Tests and safety:** Extended UI smoke walks across copied routines with shared notes, JSON/cloud round-trip, one-set review, optional second set, Undo, no third prompt, routine-default unchanged, and recorded two-set completion. Native Android physical device remains unverified. No unrelated Food, Money, weight, cloud permission, or saved history migrations.

## Previous release — v131 (November 10, 2026)

- **Every Food entry visible on the tab:** The top selected-day Food card now lists all recorded entries, newest first, instead of stopping at three. The calorie/protein totals remain at the top of that card, and the full-log editor stays available as **Edit food log**. Favorites and More foods remain below the daily log.
- **Slightly denser log:** Each top-card entry reduces vertical row padding from 9px to 7px and metadata spacing from 3px to 2px, with line-height 1.5 to 1.4. Names, nutrition details, colors, overall navigation, and the full-log modal's touch targets are unchanged.
- **Safety/verification:** Rendering and CSS only; no record schema, sorting model, Firebase rules, backup format, stored meals, sync, or history edits. UI smoke covers more than three entries, selected-day ordering, removal, top-section placement, and spacing. GitHub CI/Pages status and iPhone visual fit remain separate checkpoints.

## Previous release — v130 (November 10, 2026)

- **Morning check-in from recent readings:** The once-per-tracking-day prompt prefills each field independently from the latest saved measurement dated today or earlier, prioritizing yesterday when that is the latest. The caption says **From yesterday**, **Last recorded** with the real date, or **Already logged today**; absent body-fat readings remain blank rather than fabricated.
- **Fast, draft-only adjustments:** Each field has large **−0.5 / −0.1 / +0.1 / +0.5** buttons, using the configured weight unit and body-fat percentage. Values remain directly editable. Invalid/out-of-range adjustments are disabled; no reading is written until Save. Manual weigh-in and older dated-edit workflows remain unchanged.
- **Data safety:** Keep one weight and one body-fat record per date using existing independent streams; no migration, account rules, Health Shortcut protocol, backup format, or recovery behavior changes. Pure model tests cover latest-date selection and ± decimal adjustments; targeted UI smoke checks the loaded styles and touch targets.
- **Verification:** GitHub CI and Pages deployment must be checked separately. Real iPhone prompt layout/keyboard/touch behavior is not yet confirmed by the user.

## Previous release — v129 (November 9, 2026)

- **Lifting routine cohesion:** Replace the fixed-green native routine dropdown with horizontally scrolling, readable, color-coded routine buttons. Routines use their persisted, ID-stable individual colors (same as Home calendar markers and history cards), with one selected state and a visible Manage control.
- **Planned muscles in the routine card, not separate screens:** Place a small front/back anatomical planned-muscle visual and four compact muscle-name chips inside the selected Lifting routine card, alongside its exercise/set counts. Reuse the approved v124 anatomy and v123 set-load mapping; no new muscle geometry or logged-set accounting. No new persistent data or exercise records.
- **Remove redundant training analytics from Workout Buddy:** Remove the Set Levels buttons from picker, active, and ready/review states; eliminate the full-screen planned-versus-completed Buddy screen and the extra standalone Lifting Planned Muscle Usage panel. **Keep** the actual rolling 8-day Set Levels analytics in Progress and the per-exercise muscle anatomy preview.
- **Full source-level green audit:** Inspect all CSS for literal green declarations and their roles; add `scripts/theme-green-audit.mjs` to repeat this audit. Fix confirmed nonsemantic leftovers including the Workout Schedule weekday dropdown (previously forced `#243d2b`), the low-contrast green Back to exercises control on Buddy completion, plus ordinary Home, Food, Lifting, and editor chrome. Preserve semantic money, exercise identity, effort, and muscle activation hues. Hundreds of older literal colors remain in the legacy stylesheet but many are overridden; the source audit is not a computed-style proof across iPhone themes.
- **Verification and safety:** Targeted UI smoke assertions for colored routine switching and anatomy previews, missing Buddy analytics controls, and theme-aware schedule/complete controls; standard repo tests and GitHub CI. No changes to data schemas, Firebase records, food logs, finance, workouts, or workout Undo safety.

## Previous release — v128 (November 9, 2026)



- **Workout Buddy Undo safety:** Undo is always visible in its header with a 44px tap area, disabled only when no reversible action is available. It is no longer visually adjacent to the Exercises back button or duplicated in the set view.
- **Opening Exercises is not an Undo action:** Picker navigation preserves the last meaningful set operation; an accidentally started/finished set can be undone directly from the picker, including after exiting and reopening Workout Buddy. Exercise-selection snapshots now include the selected exercise identity, so their undo target is well-defined.
- **Finalizing an exercise is reversible:** The last finalized exercise retains an explicit Undo snapshot; Undo returns to its set-review screen and removes only the corresponding finalized Buddy lift mirror. Other completed exercises remain protected. The actual final Save workout still ends the active Undo session.
- **Undo history and unit conversion:** Existing bounded, persistent multi-step Undo remains; exercise Notes and Setup are preserved. Converting between lb/kg also converts the exercise weights in every pending Undo stack snapshot so reopening/undoing cannot restore values in old units.
- **Regression tests:** Cover accidental second set → Exercises → Exit/Resume → Undo, finalization with correct lift-mirror behavior, old snapshots, new selection-target keys, disabled header state, and lb/kg conversions. CI/Pages and real iPhone appearance are separate checkpoints.
- **Data safety:** No Firebase schema, food, finance, saved lifting history, or unrelated UI changes. This release does not retroactively reconstruct actions from a workout that was already permanently finalized before v128.

## Previous release — v127 (November 8, 2026)



- **Top Undo notice:** A compact, palette-aware Food confirmation slides down just below the iPhone safe area, keeps its Undo action available for five seconds, and animates upward on expiration. It replaces the large green overlay over the bottom navigation. Reduced-motion preference is respected.
- **Invisible Food CSV clipboard controls:** The Food editor now shows separate **Copy CSV** and **Paste CSV** buttons, with no CSV textarea or expanded panel. Copy generates the current header and Food row directly into the clipboard; Paste requests the system clipboard inside the button tap, validates a foodLog CSV row, and fills the food editor without saving until the user confirms. iOS clipboard permission failure appears as an inline message, never a silent no-op. Old visible-textbox style rules are retired.
- **Home card customization account persistence audit and fix:** Home selected food IDs were already stored in `data.preferences.homeFoodIds`, serialized into Firestore's `state/settings` account document, and restored by account load. The defect was that Save cards previously fired `void persist()` and closed before cloud acknowledgement, making a failed/offline save indistinguishable from a confirmed account save. Both Save cards and Use favorites & recent now await `persist()`; they stay open with a clear warning when Firebase has not confirmed it. Legacy local selection migration can no longer replace a non-null cloud selection.
- **Verification:** UI smoke tests exercise clipboard copy/paste and denial, Undo presence/motion, failed Firebase Home save warning, confirmed remote preference payload, and a fresh account session with local account caches removed. Actual device clipboard permissions and the user's current personal cloud data cannot be verified from this code-only workflow.
- **Data safety:** No schema, nutrition/workout/finance records, authentication identities, or unrelated features changed.

## Previous release — v126 (November 8, 2026)



- **Remaining theme typography:** Added palette-derived informational/muted text coverage across Home's calorie/protein target denominators, Food suggestions and CSV help, the Home foods selection count, nutrition card captions, blank-state notices in Money and food history, and other routine explanatory text. Strong numbers remain readable; deliberate income/expense, warning, success, active button, and anatomy colors retain their semantic distinction.
- **Food CSV usability on iPhone:** The previous CSV text link is now a properly sized outline button with explicit expanded state. Opening it synchronously focuses and selects the entire generated CSV so a clipboard Paste can replace it; a visible Select all control permits repeating the action. Paste parsing, Food Library logic, and save behavior are unchanged. CSV field uses 16px monospaced text to avoid iOS zoom.
- **Scope and safety:** No user records or Firebase schema changed; no workout/finance calculations or themes/skins removed. New typography coverage is a separate last-loaded CSS file, preserving the color-system hierarchy and making the changes easy to audit. CI and user device visual review are separate checkpoints.

## Previous release — v125 (November 8, 2026)



- **Set Levels now uses a rolling 8-day window:** Today plus the preceding seven calendar dates, independent of the Friday work week or configured routine day. Applies to Progress, the Lifting routine preview and the Workout Buddy preview.
- **No inflated planned totals:** Recent completed sets come from the lift log with active-session deduplication; routine planned sets are a separate comparison and never added into the recorded totals. Existing v124 audited muscle mappings and original anatomy are preserved.
- **Progress cleanup:** Compact, right-aligned 7/30/90-day weight selector. Latest body-fat reading moved beneath the weight graph and weekly entries; removed duplicate body-fat Edit measurements button. Single combined measurement editor remains accessible from the graph or empty-period fallback.
- **Visual and navigation repairs:** History's date row and cards use bounded grid columns to prevent iOS control overlap. Opening History from Progress keeps Progress highlighted and aria-current accurate. Routine cards use their saved colors like calendar circles, overriding near-monochrome theme coverage. Settings gear and header avoid blur/compositing effects. Routine editor's Save/Add dock remains sticky without opaque overlay or a rectangular background.
- **Release safety:** No data schemas, Firebase records, lifting history, exercise definitions, imported records, or finance logic changed. A final device rendering check is still needed independently of GitHub CI.

## Previous release — v124 (November 8, 2026)



- **Restore the approved muscle anatomy:** Roll back the v123 internal chest/abs/quads/back/glute/hamstring/calf shapes and contours to exactly the v122 Natural Anatomy paths. The outer body silhouette was never changed. Keep the front/back views, existing warm/cool highlights, recovery map, and new Set Levels. The extra adductor shape is rendered only as a separate overlay when needed so it does not alter the older exercise thumbnails.
- **Muscle mapping audit:** Verified the complete 15-exercise default library; tightened primary versus assisting roles to avoid giving equivalent-set credit for passive stabilization. Fixed predictable exercise naming aliases (for example, Machine Row and seated leg curl). Unknown custom exercises remain deliberately unmapped rather than guessed.
- **Set Levels sanity:** Confirmed from source that completed and planned exposures stay separate, current active Buddy sets are not double-counted against their finalized lift records, and existing workout/food/money histories remain unmodified. Added focused regression tests covering defaults, aliases, workload estimates, duplicate prevention, and v122 SVG geometry.
- **No unrelated feature changes:** Routine-specific calendar colors, 7/30/90-day weight chart, compact body-fat summary (no redundant body-fat graph), Workout Buddy controls, themes, and new e. branding are unchanged. Release assets and offline-cache version move to v124. Automated tests and on-device visual appearance are separate checkpoints.

## Previous release — v123 (November 8, 2026)



- **Routine colors in the calendar:** Future scheduled dates and completed session markers inherit their actual saved routine color where a routine is identifiable. Dotted rings remain planned, solid rings completed; history-only estimates and manually logged dates remain neutral.
- **Detailed anatomy and set levels:** Improved original front/rear SVG muscle shapes, added adductors, and a weekly set-exposure heatmap. One primary-muscle set = one direct set; supporting work = 0.5 equivalent sets, explicitly labeled as estimates rather than training prescriptions.
- **Planned versus completed:** A routine preview in Lifting and a read-only overlay before/during Workout Buddy show planned muscle exposure against confirmed logged sets. No exercise swapping, database schema, or historical records are modified.
- **Weight progress:** Rolling 7/30/90 calendar-day tabs (default 90 days; up to 90 weigh-ins). Removed the redundant body-fat graph but retained body-fat values, capture, and combined measurement history.
- **Release:** v123 asset URLs and offline cache. UI checks updated for the new chart and previously stale v120 stylesheet reference. CI and actual iPhone visual approval remain separate checkpoints.

## Previous releases — v121–v122 (November 6–8, 2026)

- **v121:** Original Enchanted Forest surface hierarchy, reusable semantic colors, Appearance preview and temporary inspector.
- **v122:** Portfolio-aligned lowercase e. branding and refreshed PWA icons.

## Earlier release — v120 (November 6, 2026)

- **Fourth and broader appearance audit:** The v119 iPhone screenshots still showed green visual dividers in the Food log, green unselected color-palette borders, muted sage Workout Buddy "workout in progress" text, green paycheck detail labels, a green transaction-history filter separator, and forest-tinted status/metadata elsewhere. Those are neutral interface decorations, not financial or exercise meaning.
- **Single palette-driven cleanup:** v120 builds on the existing final `appearance-coverage.css`. Border dividers, navigation disclosure labels, neutral metadata and unselected theme cards now use the synced palette's border/muted/surface/primary tokens. The user can still see Enchanted Forest green *in the swatch preview* without its green leaking into the surrounding Amethyst gallery. The audit also included neutral controls in the Food library, import, routine management, history panels, and progress charts not shown in the latest screenshots.
- **Meaningful colors retained:** Financial green/red income and expense states, warnings, muscle-activation overlays, and seven-level effort scale still communicate distinct data. The brand logo retains its identity. No record schema, layout, workflow, workout values or backup format changed.
- **Checks:** Targeted UI smoke assertions cover the exact former green dividers and labels. Updated service worker, HTML and dynamic cloud-module versions are v120. The GitHub CI pass and live iPhone visual verification are separate checkpoints.

## Previous release — v119 (November 6, 2026)

- **Third appearance pass — labels, badges and progress indicators:** Following the v118 iPhone review, screenshots still showed green Workout Buddy completed/remaining section labels, exercise count and set-progress indicators, routine setup details, timed workout metric tiles, monthly-cap separator lines, nutrition period tabs and Recent Logged Days heading, the Settings version bubble, and Cloud file sizes text/meters. The newly scoped v119 CSS in the existing `appearance-coverage.css` derives these details from the four synced palette colors. No appearance model or app structure changes are needed.
- **Semantics preserved:** Current vs completed vs pending workout progress are palette-primary/secondary/border; seven-color effort intensity scale, muscle diagrams, intentional movement-direction categories, warning/negative statuses retain meaning. Standard muted labels remain readable on Amethyst and other dark palettes.
- **Only appearance:** v119 app HTML, service worker, cloud-import cache URLs and release metadata are aligned; screenshots will need physical iPhone visual verification. Food/workout/money records and account palette storage remain unchanged.

## Previous release — v118 (November 6, 2026)

- **Second screenshot-driven appearance audit:** The user supplied 17 iPhone screenshots covering Home Eat/Workout/Spend, Food cards and planner, Progress trend/charts, Money transactions/paychecks, Lifting list/routine modal, Add Food form, and Workout Buddy bike/ready/running states. The v117 layer did not theme several nested green elements. The remaining v118 changes live in the existing \`appearance-coverage.css\` and address the root app background/header gear, Workout calendar/recovery and Lifting routine picker, Food Plan choices and food-log time/save controls, Money transaction "Category, date & more", and Workout Buddy header, clock face/Start, history, notes, labels, set editor and active set.
- **Unified appearance colors:** Nonsemantic surfaces and text now derive from the four synced palette values, rather than accidental older forest constants. This includes the root \`#app\` background, which v117 missed despite setting root colors. Keep effort intensity, muscle activation art and warning/negative states semantically distinct.
- **No schema/flow changes:** This is a theme-only, dark-mode-only improvement. The user's original Enchanted Forest green is still the default; Ocean at Night is separate blue. Saved palettes, skins, data and existing controls are unchanged. Release v118 updates HTML asset tokens, dynamic cloud module, service-worker cache, the project context, and targeted UI smoke coverage. CI does not substitute for on-device visual QA.

## Previous release — v117 (November 6, 2026)

- **All-screen dark-palette coverage:** v116 account palettes and skins were not recoloring multiple older hard-coded surfaces. The iPhone screenshot review showed mixed colors in Home totals/controls, Food cards, Lifting exercise cards, Progress charts, Money paycheck views and bottom navigation. A final `appearance-coverage.css` layer now derives these visible backgrounds, controls, card footers, charts and text accents from the selected account palette.
- **Default Enchanted Forest remains green; Ocean at Night is optional blue.** The coverage stylesheet applies to all dark themes, including the default forest. Upper/Lower/Full routine distinctions now use palette-relative shades; active muscle anatomy, alerts, negative amounts and other semantic statuses retain their meaningful colors.
- **No data change:** This is purely CSS/release wiring. Existing palette storage, custom palette editor, Firestore, backups, food, lifting and finance data are unchanged. v117 HTML, service-worker, cloud import, asset references and tests are aligned. Physical iPhone appearance still requires user review.
- **Unrelated workout substitutions** remain a separate future workstream.

## Previous release — v116 (November 6, 2026)

- **Appearance gallery:** Settings now includes subtle color palettes and optional decorative skins. The existing dark forest-green Everyday appearance remains the original default, labeled **Enchanted Forest**; blue is separately named **Ocean at Night**, never "classic." Harvest/Thanksgiving, Winter Holiday/Christmas, High Seas, Forest, and Pixel Arcade skins stay available year-round. Skins change visual treatment without changing navigation, Workout Buddy anatomy, or data.
- **Multiple custom palettes:** Up to 20 named palettes, each with editable background, card, primary, and secondary colors, can be created, selected, edited, and deleted. Color inputs show a live in-dialog preview; saving a palette applies it, while canceling leaves current appearance unchanged. Selecting a skin starts with its matching palette, and selecting a different palette keeps the skin.
- **Safe account-backed configuration:** The existing light/dark/system preference remains intact; custom palettes and skins apply to Dark mode. Account preference appearance is validated in the shared notebook model, defaults to the original forest appearance for older backups/accounts, and round-trips through existing Firebase static settings and full JSON backups. No dated logs, routines, Finance records, Firebase rules, or monthly schema are changed. v116 asset URLs and offline cache are aligned. CI and iPhone visual verification are independent milestones.
- **Scope note:** This separate appearance release does not implement or settle the proposed workout variation system; approved alternatives and per-set swaps remain design decisions for later development.

## Previous release — v115 (November 4, 2026)

- **Money tab selector restored:** The Overview screen again includes the exact same Overview / Transactions / Planning navigation control already shared by the other two Money screens.
- **Two-week summary is one card:** Toggling two weeks combines the two underlying paycheck windows into one read-only summary with aggregated income, scheduled bills, other purchases, dates and remainder. Expandable paycheck details retain both scheduled entries and their individual received/expected status; the one-week view and saved allocations remain unchanged. The What-if purchase calculation uses the combined period in two-week mode. If only one scheduled check exists, it is displayed as a single period, never duplicated.
- **Scroll retention:** `render()` retains the scroll position of the main page scroller when updating the current screen (e.g. Progress nutrition chart period navigation or budget month selectors). Switching pages starts a fresh scroll container at the top. The iOS viewport-origin cleanup for keyboard positioning is separate and unchanged.
- **Cloud recovery auto-retry and import acknowledgement:** On login, when Firestore confirms a recovery copy is based on the current server revision, Everyday attempts to sync it automatically, and retries after foreground/online events with a cooldown. Existing conflict detection remains intact: changed server revisions still require explicit review, and failures retain the recovery and warning. Successful section/CSV/full JSON imports update the last-confirmed local account snapshot and retire old recovery storage, preventing the restored-unsaved banner after a successfully confirmed import. No recovery is deleted merely because the warning appears.
- **No Firebase security-rule or schema changes.** Regression tests cover combined paychecks, preserved scroll on Money/Progress, and successful import recovery-cache acknowledgement.

## Previous release — v114 (November 3, 2026)

- **Paycheck-first Money setup:** Fresh Finance accounts see a clear first step to add a payday, expected take-home amount and frequency. The setup button opens the existing reusable budget schedule form preselected to **income / Paycheck / weekly**, not the old generic expense / monthly defaults. Users can choose a different frequency and anchor date; a saved schedule is not automatically marked received.
- **Recurring-bill next step:** Once a payday exists but there are no recurring bills, Money shows an explicit `Add a bill` action that opens the existing expense schedule editor, and states that the calculated remainder is incomplete until obligations have been entered. No existing account data or schedule is replaced.
- **Honest period controls:** Weekly paycheck schedules retain `1 week / 2 weeks`. Other pay schedules show `1 check / 2 checks`, matching the actual paycheck-window calculation instead of incorrectly implying calendar weeks.
- **Contained release:** This is a first-run UI improvement using existing `budgetPlan` data, with no Firestore schema/rule changes, new onboarding flags or automatic Finance reset. Existing transaction, budget, bank and import logic is preserved.
- **Verification:** Updated Money smoke coverage checks the paycheck-first form defaults and cancellation. Standard model, UI and Firestore rules checks apply.

## Previous release — v113 (November 3, 2026)

- **Finance-only account reset in Settings:** `Reset Finance data` offers an explicit red `Delete all Finance data` action with a disabled three-second countdown and Cancel option. The user must click again after the countdown. The app never resets anything automatically on update.
- **Precise reset scope:** `resetFinanceData` clears `transactions`, `classificationRules`, and the entire `budgetPlan` (balances, category limits, paydays, bills, per-occurrence statuses, unresolved imported bank rows). Food, Lifting, Progress, saved foods, measurement history, account settings and Apple Health integration are untouched.
- **Safe cloud write:** Reset creates a separate candidate, requires an idle authenticated cloud session, and commits to Firebase before changing the displayed notebook. Failed writes preserve the original data and show an error in the confirmation dialog. Device/demo/offline workspaces use their own storage. After successful cloud reset, local confirmed-account cache is updated and recovery state cleared.
- **Firebase storage nuance:** v3 months may contain both finance and fitness records. The reset rewrites changed active monthly documents and removes finance-only months from the active manifest. It does **not** delete old migration documents, old unindexed month documents, or independent backups; this is an active-account reset, not a cryptographic or physical purge. It requires no new Firestore rules.
- **Coverage:** `tests/finance-reset.test.js` exercises data isolation and month-partitioned serialization; UI smoke confirms the countdown is disabled and cancel is non-destructive.

## Previous release — v112 (November 3, 2026)

- **Firestore v3 month-partitioned account storage:** `account-monthly.js` converts the normalized Everyday notebook to private account-level `state/settings` (goals, appearance, Home layout and prompt date), `state/catalog` (saved foods/favorite flags), `state/routines` (routine definitions, active Workout Buddy state and schedule), `state/financeConfig` (merchant rules and budget plan), and one `state/month-YYYY-MM` JSON document per calendar month of food logs, weights, body fat, lifts, completed workouts, and transactions. `state/manifest` v3 indexes active months and per-document versions. All documents retain 800,000 UTF-8-byte individual caps. Account history has no combined 800 KB cap.
- **Automatic, non-destructive migration:** v1 state/main and v2 Nutrition/Lifting/Finances remain readable. When a previously v2-split account saves for the first time in v112, the app atomically writes its v3 manifest and all v3 account/month documents in a Firestore transaction; original v1/v2 documents are intentionally retained and not overwritten or deleted. Subsequent saves rewrite only changed files plus the manifest, with a shared revision to detect cross-device conflicts. Missing/mismatched documents fail closed rather than replacing account data. Firebase rules must be deployed for v3 paths before users attempt the migration; otherwise client-side recovery copies remain available and cloud saving fails safely.
- **Account settings as source of truth:** `data.preferences` contains `homeDashboard`, `homeFoodIds`, `theme`, and `legacyImported` with validation and full-backup compatibility. On the first signed-in load, old browser keys for these three preferences are adopted once if a preference migration has not been completed; the account settings file is written and legacy keys removed only after a confirmed cloud save. Favorites stored as `foods[].pinned` already live in the synced food catalog. The Apple Health Shortcut token/config already lives in private Firebase `users/{uid}/integrations/appleHealth`; never place its secret token into the general settings file or backups. For secure offline reload and recovery, the PWA still holds account-scoped last-confirmed/unsaved **copies**, but they are not independent settings sources.
- **Backups:** Settings has a month selector for `everyday-month-YYYY-MM.json`, exporting all dated record categories for that month; a full `Export everything JSON` continues to include all months and account settings in the established compact format. Legacy Nutrition, Lifting, and Finance section backups stay available and older imports remain compatible. `importMonth` is available as a validated model function, but no in-app monthly import workflow has yet been added.
- **Progress:** Remove redundant displayed BMI metrics from the Weight trend weekly summary (keep BMI calculation available elsewhere), preserve both 90-record Weight and Body Fat graphs, and route either chart's Edit action to one **All measurements** list keyed by date. Paired dated entries display both values where present; a combined editor can update or remove either reading independently while retaining unchanged IDs and Apple Health source metadata.
- **Validation:** Focused model tests cover month boundaries, exact backup reconstruction, automatic v2 migration without deleting originals, one-month updates vs static settings updates, historical month removal, per-file UTF-8 size limits, and Firestore security/Health integration. This release changes the Firestore rules; publish them before relying on cloud writes. iPhone appearance/restore still require user verification.

## Previous release — v111 (November 3, 2026)

- **Money overview redesigned around a paycheck, not an inferred bank balance.** Scrollable Money begins with 1 week / 2 weeks views anchored to existing weekly/biweekly payday schedules. Displays expected/received check, expanded individual scheduled bills, receipt-first purchases, prominent signed remainder, optional paycheck-based what-if, next check kept separate, and previous period's unrolled remainder as **held back**, never added to the new income amount. The view works without setting a manual bank balance.
- **Paycheck overrides and bill allocations:** `budgetPlan.paycheckAmounts` stores actual income in integer cents by stable schedule ID and occurrence date, preserving future expected paychecks. `budgetPlan.billAssignments` optionally moves a particular bill occurrence to a different pay period without moving the due date. Paid status doesn't remove the bill from that paycheck's budget. A transaction manually linked via `billKey` supersedes that bill's expected amount and does not double count, even when its bank posting occurs after the next payday.
- **Receipts and categorization:** `recordType=purchase` and `recordType=receiptItem` extend existing mixed Everyday CSV with optional receipt `purchaseId`, merchant, account label and itemized name/category/amount; a receipt creates exactly one transaction and up to 100 structured items. Item totals must match the purchase amount in exact cents; each item's category contributes independently to monthly caps. Existing plain `transaction` CSV, free-text `itemization`, merchant rules, classifications, historic IDs and backup formats remain supported. A matched bank amount discrepancy is kept separately using original `receiptAmountCents` and a reviewable `adjustmentCategory`/note; no tip or reason is inferred.
- **Bank statement review:** `bank-reconcile.js` gives Matched, Needs review, and New preview groups, with amount/date-sortable and merchant-searchable receipt candidates. Automatic merge requires unique exact cents, matching account labels, recognizable merchant, and dates within seven days. Ambiguous candidates and plausible mismatched amounts defer by default; manual actions can select **any** existing unmatched receipt, import separately, or leave an unresolved bank row in `budgetPlan.unresolvedBankRows`. Defer does not block saving accepted imports. The original receipt transaction ID and purchase date persist after matching, bank posted date and immutable bank wording are retained, and repeated bank identity is idempotent. Unresolved rows can be reopened from Money without the original CSV.
- **Existing tools retained:** Recent purchases and monthly category caps follow the paycheck cards; manual balance and its as-of date are lower down; legacy Planning, Transactions, spending insights, classification queue, merchant rules, CSV import, ChatGPT enrichment, bank importer, and settings backups remain accessible.
- **Receipt CSV for ChatGPT (paste into Money → Paste receipt CSV):**

```csv
recordType,date,kind,amount,description,category,merchant,accountLabel,purchaseId,itemName,itemCategory,itemAmount
purchase,2026-11-03,expense,30.00,Walmart visit,Uncategorized,Walmart,BofA Checking,walmart-1103,,,
receiptItem,,,,,,,,walmart-1103,Groceries,Groceries,18.00
receiptItem,,,,,,,,walmart-1103,Paper towels,Household Supplies,12.00
```

  For a simple single-row purchase, omit the `receiptItem` rows and leave `purchaseId` blank. Receipt item amounts must sum to the receipt's original total. The bank can later post a different total, which requires manual review. Purchase date must reflect the purchase, not delayed bank posting; the posted date is separately retained on matched records.
- **Release integrity:** Versions and offline precache updated for v111, with focused tests of rollover, actual-income overrides, posted bills, mixed category totals, original receipt amount differences, duplicate identities, and deferred match decisions. Passing GitHub checks and real iPhone review are separate milestones; do not claim real device verification until the user confirms it. Existing viewport resume mitigation is unchanged.

## Previous release — v110 (November 2, 2026)

- **Progress cleanup:** Remove the duplicate full-page Individual weigh-ins and Body fat list sections; remove Workout timing's long explanatory paragraph. Do not delete measurement history. Keep compact Edit weigh-ins, Add body fat and Edit readings controls inside the existing chart cards; body-fat edit opens a complete readings modal, with the existing edit form.
- **Last 90 measurements:** Each chart independently uses the 90 most recent logged readings, not a shared six-week date window. Weekly summary rows remain six weeks. The seven-day rolling weight average uses all stored weights, including older points just outside the displayed window, to avoid a left-edge calculation error. Tighter dot radii on dense charts.
- **iPhone PWA resume/rotation:** Restore document scroll origin on pageshow, foreground return, window focus, and after rotation, retrying once after WebKit geometry settles without re-rendering, interrupting a focused input, or changing nested page scroll. Request portrait-primary in the web-app manifest as a **best-effort preference** (iOS may ignore it), and align the launch background with the dark shell. This is a mitigation for intermittent iOS standalone viewport shifts, not a proven engine fix.
- Bump version, app/index/SW/cache URLs and focused UI test coverage. CI, merge, Pages availability and actual iPhone verification are separate milestones.

## Current release — v109 (November 2, 2026)

- **Progress weekly summaries:** Remove the redundant six-week/BMI explanation beneath the weekly rows and omit repeated year labels from each week-count subtitle. Preserve the week range, weigh-in count, current-week marker, average weight, and BMI.
- **Home routines:** Continue resolving historical routine titles, colors, and identity through the shared routine renderer from v108, but constrain Home's three cards with explicitly scoped compact title/summary/padding/arrow CSS. Avoid inheriting the large Workout Buddy chooser card dimensions or disturbing the side-by-side anatomy layout.
- **Progress exercise cards:** Reuse the shared `exerciseCardMarkup()` plus independent `exerciseCardWithMuscles()` equipment/anatomy treatment already used by Lifting and Workout Buddy, including both the compact Progress list and View all. Keep latest top-set information in the summary away from the equipment image; do not duplicate SVGs or change history data.
- **Cable icon:** Redraw the shared pulley SVG with a narrow hanging taper over the wheel, a rope that angles outward on the left, and a rope extending straight down on the right.
- **Release:** v109 references in index.html, app.js service worker registration, sw.js precache, and version.json; focused UI smoke coverage added. Merge/Pages/iPhone appearance require independent verification.

## Current release — v108 (November 2, 2026)

- **Workout Buddy warm-up:** The bottom-right Dial was selected from v106's four clock previews. v108 removes the other previews and renders one large analog dial centered above the Start/Pause/Resume control. A wall-clock-driven second hand rotates six degrees per second (one complete rotation each minute), with a 5-minute countdown; the normal Continue transition still saves exactly as before, and the visual timer writes no workout fields. The shared cable-equipment SVG is simplified to a prominent wheel, groove/hub and short rope/hook, rather than the whole pulley machine.
- **Fast local startup:** Remove static startup loading shell from index.html and omit the full-height "Loading your dashboard" replacement during account initialization. Hydrate current device/JSON/demo data or existing per-user confirmed/recovery snapshot synchronously before account/cloud refresh. Remember the account UID as a local cache hint, validating it against the authenticated UID and switching to the correct account's data on auth state changes; the existing recovery-vs-cloud revision and conflict logic remains authoritative. Clicks remain gated by existing authCheck while authentication is unresolved. Offline backup and manual data entry preserved.
- **Routine slot identity and color:** History/recent routine UI resolves live name/color through stable workoutTemplate.id / workoutHistory.workoutId, so renames such as "Full body" to "Full" retroactively update historical card titles and tones without changing set logs or history IDs. Stable preset IDs retain Upper/Lower/Full tone even when renamed; deleted routines fall back to snapshot names. The routine editor now has a native color picker. Template color is optional validated #RRGGBB, round-tripped through data.js and compact storage-model.js for cloud/local JSON compatibility. Active workout's display name follows routine metadata changes; its exercise/record IDs are not altered.
- Version v108, app/data/storage model references, styles, index, service worker cache/precache, focused smoke assertions and this context are aligned. CI, merge, Pages deployment and visual iPhone approval are separate milestones.

## Current release — v107 (November 2, 2026)

- **v107 — shared Lifting and Workout Buddy exercise cards:** v106's correct equipment SVG positioning beside the independent blue anatomy preview was accidentally scoped to `#buddy-root .buddy-picker-screen`. Generalize those same positioning and sizing rules to the shared `.exercise-muscle-wrapper` card shell so the regular Lifting exercise list is fixed too. Keep existing exercise card action semantics: Lifting opens a new manual lift; Workout Buddy selects/edits an exercise; the blue anatomy tile independently opens muscles. The pulley SVG remains shared for cables.
- **Shared colored routine cards:** `routineChoiceCard()` now renders the Workout Buddy "Choose a routine" modal, Lifting "Recent routines" and existing Home recent routines from one reusable renderer. Upper = green, Lower = purple, Full body = brown, based on routine name rather than list index. Modal choices display only larger routine names with an arrow; remove all "6 exercises" and "Bike warm-up first" subtitles. Lifting recent routine cards display larger routine name on the left and date on the **right**, without duplicate count subtitles; retaining existing `routine-history-detail` action and history IDs. Home's compact variant remains intact. Existing complete workout records, cloud recovery, money and nutrition untouched.
- `version.json`, `index.html`, `app.js`, `sw.js`, CI smoke assertions and this context synchronized for v107. Merged code, passing CI, Pages and iPhone visual approval are separate milestones.

## Current release — v106 (November 2, 2026)

- **v106 — Workout Buddy picker card art and bike clock previews:** Reserve a square just to the **left** of each blue anatomy tile for the faded equipment SVG; neither artwork overlaps the other. Replace cable handle equipment SVG with a pulley-wheel design. Completed-exercise cards replace generic "2 completed sets" copy with stacked per-set weight × reps · effort, keeping the whole card as the completed-set editor action and the anatomy button independently tappable.
- **Bike warm-up screen (visual-only):** Remove step number, WARM-UP label, instructional paragraph, and "Bike finished" subtitle. Keep "Bike · 5 min" and the original Continue action. Display four selectable **animated** clock styles (Ring, Orbit, Digital, Dial) in a 2×2 grid with Start/Pause/Resume cosmetic countdown; no additional saved fields, timers, workout transitions, cloud sync changes or new navigation. The pre-existing Continue action still persists the warm-up transition exactly as before. Animations support reduced-motion settings. This pass does not finalize a clock style; user can compare four variants on iPhone.
- Increment whole-number version to v106, update asset and service-worker cache references and focused UI smoke tests. CI, merge, Pages and real-iPhone approval remain distinct milestones.

## Current release — v105 (November 2, 2026)

- **v105 — Workout Buddy layout consolidation.** Picker uses a single `0/6 exercises` (counting up) at top left, no redundant remaining count, no ready-to-lift/choose/description titles, and only short labels **COMPLETED EXERCISES** and **REMAINING EXERCISES** to separate the two sets of cards. The completed section has no second x-of-y count. The exercise review's confirmed-set rows no longer show a redundant COMPLETED SETS title and display weight/reps, effort, and duration as one natural line after Set N, without separate right-justified columns. Review confirmation timing remains unchanged.
- **Completed exercise editor:** Reuses the *main Buddy exercise* header, rep-range chip, setup chip, notes toggle/editor and Journal, with both original shared weight/reps/effort controls and compact layout; Setup and Notes expand only as needed, keeping normal two-set editing fitted in one iPhone viewport when space permits with safe overflow fallback for smaller/accessibility displays. The anatomy thumbnail remains an independent action. Edit drafts are saved explicitly, preserving existing Buddy lift IDs and backup/sync compatibility. The bottom action style, undo behavior, money and nutrition are unchanged.
- Update versions and precache in `version.json`, `index.html`, `app.js`, `sw.js`; UI smoke assertions cover picker labels, confirmed row and completed editor. CI, merge, deployment and iPhone review remain separate milestones.

## Current release — v104 (November 2, 2026)

- **v104 — Workout Buddy Notes iPhone keyboard and completed-card editing.** When the iOS keyboard opens in Workout Buddy, hide the bottom set/Next exercise button temporarily and allow scrolling to the active field; restore it when dismissed. Do not change normal workout-button styling or position.
- **Completed exercises:** The card body opens a full-screen editor for both sets, reusing Buddy weight/reps/effort controls with Notes, Setup and Journal. The blue muscle thumbnail retains an independent muscle-guide action. Draft edits require explicit Save changes; Exercises cancels. Save updates the existing activeWorkout exercise and the same Buddy lift record ID (no duplicate, no set timing loss). Journal and anatomy navigation return to editor. No unrelated changes. Real-device visual verification still required.
- version.json, index/app references and service worker cache aligned. CI, merge, Pages deployment and iPhone approval are separate.

## Current release — v103 (November 2, 2026)

- **v103 — Workout Buddy iPhone corrections:** “Completed sets” only lists confirmed sets: a set that has just finished its timer is still in review and must be excluded until the user advances (after finishing set 1: 0 rows; while reviewing set 2: 1 row). Keep the provisional set editable. Return bottom action text to the *older pre-v99.7.15* caption-era font: DM Sans, 700 weight, 25px (23px on short viewports), left aligned, full white; **do not** re-add the removed small subtitle. Preserve the integrated right-hand REST counter and bottom button placement. General “↶ Undo” now retains a bounded 30-transition stack, including set starts/finishes, return to chooser, and switching between unfinished exercises. Restoring snapshots preserves independent notes and machine setup changes. Undo cannot reverse an already completed exercise: confirming the final set and finishing an exercise clears its undo history; saved lift IDs are preserved. Single-step v102 undo snapshots can be read during migration. All other data, cloud and fitness features unchanged. v103 cache, model version, regression tests and release files aligned. CI, merge, Pages and real-device review must be tracked separately.

## Current release — v102 (November 2, 2026)

- **v102 — original button label typography/centering fix:** User's iPhone screenshots confirmed that v101's Start set, Finish set, and Next exercise labels still appeared left-aligned and gray. Root cause: the ready/review action label was wrapped in a `<span>`, while legacy `.buddy-a span` styles applied 72% opacity and earlier button rules defaulted to left alignment; v101 also chose the wrong font. Remove the action-label `span` altogether, restoring direct `<b>` markup, and use the **exact** original v99.7.16 CTA rule `font:750 clamp(24px,6vw,31px)/1.1 'Outfit',sans-serif;` with `letter-spacing:-.02em`, full white and center alignment. Retain the full-width bottom buttons, without small subtitles; the rest countdown stays on their right when applicable. No other visual redesign, data/model, workout history, or cloud changes. Automated checks, merge, deployment, and iPhone visual approval are separate milestones.

## Current release — v101 (November 2, 2026)

- **v101 — Workout Buddy iPhone feedback:** Keep Start set, Finish set and Next exercise as full-width bottom buttons; restore the original button text's DM Sans family, weight and size, and center labels horizontally/vertically. Do **not** restore the previously removed small explanatory action subtitles. For rest, center the action label within its left portion while keeping the rest countdown on the right, integrated into the same button. Fix COMPLETED SETS so the newly finished set remains listed while it is in review (including the final set). The exercise-specific full-size anatomy appears only while the set is active, and the two bodies are now level/aligned horizontally rather than diagonally staggered; keep Home's separate diagonal visual unchanged. Preserve the small blue-backed thumbnail before/between sets, Undo, notes focus, active session recovery, money/food and all persistent records. Automated tests, PR merge, Pages and real-iPhone visuals must be verified separately.

## Current release — v100 (November 2, 2026)

- **Versioning rule:** v100 is the next whole-number release after v99.7.17. Every subsequent release increments by one (v101, v102, etc.), without decimal patches or forced multi-version cycles. Native iOS packaging is a separate future decision. This rule supersedes all older v99.8/v99.9 or native-v100 roadmaps below.
- **v100 — user-requested Workout Buddy visual restoration (real-iPhone review pending):** Reverse the unintended v99.7.17 ready/review layout change. Keep Start set N and Next exercise as the prominent bottom action; show the rest countdown in the *right half of that same bottom action* when applicable. Restore the small blue-backed exercise anatomy thumbnail in the upper-right of the heading on ready and review screens; no full-size bottom anatomy there. Large front/back exercise-specific figures appear **only while a set is actively timed**, above the bottom Finish set action. Hide redundant Undo start exercise; keep legitimate set undo. Preserve v99.7.17 Home Workout Resume functionality, shared exercise-color mapping, iPhone Notes 18px focus fix, touch-offset mitigations, stored records, and prior financial classifications. Version/cache, UI smoke tests and context updated. CI/merge/Pages and physical iPhone approval must be reported separately.

## Current direction — November 1, 2026

- **v99.7.17 — Buddy layout iteration (iPhone review pending):** Move ready/review Start set N and Next exercise into top toolbar by Undo/rest; hide redundant Undo start exercise (Exercises already returns to chooser) but retain set undo and active bottom Finish set N. Standardize full-opacity dark-green bold action styling and vertically centered text; change PERCEIVED EFFORT to EFFORT. Share Home's pair layout via `muscleExercisePairMarkup` with Buddy's existing primary/secondary/quiet per-exercise bodySvg colors, larger diagonally offset bodies below running time or Notes on ready screen; omit former tiny heading thumbnail, hide large view while keyboard editing. Home Workout fourth button switches '+' to Resume if an active workout exists and opens Buddy directly. No data/model or cloud changes; physical iPhone test needed.


- **v99.7.16 Buddy Notes iPhone focus zoom (device verification pending):** Despite an earlier 16px Notes textarea rule, the iPhone sometimes auto-zooms while entering text. Explicitly set its computed font-size to 18px with text-size-adjust 100%, blur the textarea *before* dismissing/re-rendering with Done, then sync keyboard viewport and document scroll/touch origin on the next frame. Do not add `maximum-scale=1` or disable manual pinch zoom, and do not claim that JS can reliably reset Safari zoom. Keep observing intermittent tap-offset reports. No data model changes.


- **v99.7.15 Buddy set action + touch-offset mitigation (real iPhone verification required):** Remove visible `Review set N`, `Set N of M` and `Set N in progress` from ready/review/running states; keep just large Start set N / Finish set N / Next exercise CTA, separate rest countdown and slim progress bars with aria-label count. Ticker no longer modifies removed status span. During Buddy, normalize document scroll origin when input blur ends, visual viewport shifts, app foregrounds or normal touch starts; do not interfere while editing or change the proven v99.7.7 global menu-viewport fix. Intermittent taps registering below the finger are not fully diagnosed or device-verified. No stored data changes.


- **v99.7.14 full food-log modal fix (iPhone sign-off pending):** The Food page's shared nutrition metric CSS previously excluded `.food-log-totals`, leaving its legacy small-label styles to turn current and goal protein `g` into separate lines and misalign its progress bar. Extend the shared metric and `scaleX` meter selectors to the All food entries modal, preserve page-specific colors and both inline units. No measurement or logging logic changes.


- **v99.7.13 daily check-in (iPhone review pending):** The once-daily first-open weight prompt now includes a second optional body-fat percentage field adjacent to weight. A shared date/save action saves weight, and body fat only when entered, with same-date upsert to avoid duplicating Shortcut-synced readings. New manual weigh-ins support both fields; edit-weight and the separate Progress body-fat editor retain their behavior. No model/cloud changes.
- **DEFERRED BUG / NEXT HEALTH WORK:** The iPhone Health Shortcut intermittently fails. Diagnose invocation, Shortcuts automation/permissions, app foreground/return, callback handshake, stale/duplicate readings and recovery messaging. **Do not change or claim to fix the Shortcut in v99.7.13.** Keep the manual daily body-fat fallback available regardless of Shortcut status.


- **v99.7.12 — review patch pending iPhone signoff:** Restore near-full Food-card typography and controls on six-card Home; prevent anatomy overlap via independently clipped, padded SVG columns; center calendar Schedule button; apply one shared scaleX bar-fill calculation for Home/Food; install supplied Minimal Peak header mark and dark app/website favicon/PWA icons. Keep the verified iOS viewport solution and shared dock clearance. No data changes.


- **v99.7.11 design parity (iPhone check pending):** Home and Food daily nutrition now share a metric markup helper and styling: calories/protein numbers, font, positions, units, goal type and bar widths/heights/positions are identical; per-page meter/card colors remain. Standard full-size Food quick-card renderer is reused in Home using only a compact `food-card--compact` modifier, retaining the Food card’s title/footer treatment and edit/accuracy elements. Home selector now reads Eat / Workout / Spend. First paint matches. Preserve fixed iPhone viewport and 18px dock clearance. No data/model or cloud changes.


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
