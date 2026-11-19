/** Source-grounded version history collected from PROJECT_CONTEXT.md and README.md. */
export const RELEASE_HISTORY=[
 {"version":"153","title":"v153 — Lifting comparisons and quick rep ranges","summary":"Workout Buddy finished-set review shows factual same-exercise set comparisons against last time and target-range guidance without changing weights. Exercise Progress shows previous versus latest top sets. Routine and per-exercise target editors offer 8–12, 10–16 and 12–20 one-tap rep presets with normal Save confirmation. No lift history or workout routines are migrated.","source":"new"},
 {"version":"152","title":"v152 — Pantry and optional recipe creator credit","summary":"Food > Cooking adds Pantry quantities tracked as reference servings, separate Pantry JSON sharing and opt-in ingredient deductions when finishing a batch. Shortages are checked before changes; historical meals and batches are unaffected. Recipes can carry creator credit through export/import with an independent display choice. Stock survives account sync and backups.","source":"new"},
 {"version":"151.1","title":"v151.1 — Four-day exercise guide in Settings","summary":"Settings adds a self-contained, offline-ready Upper A, Lower A, Upper B and Lower B guide with 36 exercise placements, exercise setup, form cues, common mistakes, video demonstration links and optional on-device checkmarks. It opens inside a closable app viewer; no user training or nutrition data is changed.","source":"new"},
 {"version":"151","title":"v151 — Prepared portions and leftovers","summary":"Prepared batches log eaten portions or weighed grams on selected dates, with fixed historical nutrition. Leftovers derive from linked Food logs rather than a separate counter. Editing or deleting a food log updates the batch remainder. JSON backups and monthly cloud history preserve batch links; cooking never automatically logs food.","source":"new"},
 {"version":"150","title":"v150 — Native common ingredients and recipe linking","summary":"Cooking now has a built-in offline catalog of 102 common ingredient reference servings, grouped by category and searchable without importing foods. Existing Egg Fried Rice and other legacy recipes offer Review matches to compare per-serving nutrition and explicitly link all recognized ingredients to the common or personal library, updating the existing recipe without duplication. Recipe editing supports searching the common ingredient catalog, while personal overrides are optional. Historical prepared batches and food logs remain untouched. Common nutrition values are estimates, not package labels.","source":"new"},
 {"version":"149","title":"v149 — Ingredient Library and guided Cooking","summary":"Food > Cooking has a categorized Ingredient Library built on Everyday’s existing saved-food definitions. Recipes use linked ingredient nutrition as a single source of truth, while imported or old custom ingredients can be linked or explicitly added to the library. Recipe ingredients appear as expandable list rows; instructions remain editable without a separate boxed form. Cooking now presents a preparation list and tappable, persistently completed instructional steps, with batch adjustments tucked into an optional section. Existing cooking sessions, prepared batches, food logs and past nutrition remain unchanged.","source":"new"},
 {"version":"148","title":"v148 — Cooking sessions and prepared batches","summary":"From Food > Cooking, a saved recipe can now start a separate, recoverable cooking session. Edit ingredient amounts, nutrition, instructions, portions and optional finished grams without changing the reusable recipe. Save progress and resume later, or finish to create an immutable prepared-batch snapshot. Prepared batches appear in Cooking and can be reviewed. None of these actions logs food; portions and leftovers are planned for v149.","source":"new"},
 {"version":"147.1","title":"v147.1 — Readable Food Save confirmation","summary":"Food Save confirmation now separates the food name from the save destination on two wrapping lines, using shorter status text such as Saved to account. The notification sits above bottom navigation rather than covering the Everyday header and tracking date. Undo remains available for newly logged single foods.","source":"new"},
 {"version":"147","title":"v147 — Food saving reliability and update readiness","summary":"All Food Entry saves now provide visible destination-aware confirmation (account, device recovery, demo or offline workspace), not only logs from saved Food Library cards. Manual single-food logs also offer Undo; multi-food batches confirm their count without a misleading single-item Undo. Invalid submissions show inline validation; repeated submits of the same form are guarded. Cloud completion refreshes the update banner so a previously blocked refresh becomes available when safe. Existing data and account verification are preserved.","source":"new"},
 {"version":"146.1","title":"v146.1 — Food Save response and food-log labels","summary":"Food Entry Save now uses explicit Everyday validation rather than silent browser validation, remains tappable during account confirmation to explain why an entry cannot yet be committed, and reports preparation errors. Full food log hides the redundant Viewing date label and repeat date before the entry count.","source":"new"},
 {"version":"146","title":"v146 — Routine CSV export and portable settings","summary":"Export any individual routine or the complete routine library to a CSV that can be imported again. Includes routine colors, exercise order and definitions, setup notes, muscle profiles, exercise cues, sets, rep ranges, rest seconds, and multiple scheduled weekdays. Import automatically matches existing exercises, adds missing ones, and offers an explicit choice to apply CSV colors when updating saved routines.","source":"new"},
 {
  "version": "145",
  "title": "v145 — Settings, Favorites, and Lifting reliability",
  "summary": "Home favorites replace separate shortcuts, wordmark consolidated, leaner Settings with a full release history, safe exercise deletion, improved retirement visibility for Finance, and stable routine tab scrolling.",
  "source": "new"
 },
 {
  "version": "144",
  "title": "v144",
  "summary": "Unified editable Food Entry queue: The existing + Add another food flow now generates collapsible, individually editable queued-food cards. Each card supports food name, calories/protein per serving, serving amount and presets, date/time, optional Fo",
  "source": "CONTEXT"
 },
 {
  "version": "143.1",
  "title": "v143.1",
  "summary": "Requested UI hotfix: Restore the saved-food logging modal's visible heading with the text Food Entry (not the older Log saved food), retaining the existing Close button, color palette, equal-width bottom actions, and all logging behavior. The dialog'",
  "source": "CONTEXT"
 },
 {
  "version": "143",
  "title": "v143",
  "summary": "Balanced Food Entry surfaces: Restore the lighter, theme-derived Food name, calories, protein, and date fields from before v142. The central Time display now shares their exact --ap-input background and palette-based border, rather than --ap-deep. Co",
  "source": "CONTEXT"
 },
 {
  "version": "142",
  "title": "v142",
  "summary": "Food-log visual cleanup: On the Log saved food form, hide the large visible modal heading while retaining the descriptive dialog label for accessibility and the existing Close button. Other food form titles (Add food, Edit food log) remain. Matched d",
  "source": "CONTEXT"
 },
 {
  "version": "141",
  "title": "v141",
  "summary": "Compact Food Entry: The submit action reads Save (instead of Save food log). The pre-auth account-checking hint and the redundant bottom explanation about saved foods/JSON backups are removed. The Now and No time shortcuts move onto the Time label ro",
  "source": "CONTEXT"
 },
 {
  "version": "140",
  "title": "v140",
  "summary": "Immediate cached Food-card preview: The v139 startup fix preserved opened dialogs but pre-auth click gating still ignored taps on saved food cards until the Settings gear unlocked. If the device has a validated last-confirmed account snapshot, the ma",
  "source": "CONTEXT"
 },
 {
  "version": "139",
  "title": "v139",
  "summary": "Startup Food Entry interruption fixed: Cloud account loading previously called the full render() at the start and end of the network request, destroying any modal opened using a local snapshot and returning a user visually to the underlying page. Bac",
  "source": "CONTEXT"
 },
 {
  "version": "138",
  "title": "v138",
  "summary": "Muscle diagrams repaired for imported exercises: The existing front/back SVG now highlights named movements including Incline Chest Press, Pec Deck Fly, Reverse Pec Deck, Face Pull, Shrug, Hammer Curl, Romanian Deadlift, Hip Thrust and Back Extension",
  "source": "CONTEXT"
 },
 {
  "version": "137",
  "title": "v137",
  "summary": "Safe workout CSV import: My routines → Import workout CSV, also available from Settings → Import data. Import program rows through a dedicated review screen that recognizes matching existing exercises by name+equipment and existing routines by name. ",
  "source": "CONTEXT"
 },
 {
  "version": "136",
  "title": "v136",
  "summary": "Hotfix — restore v133 Food Entry: Removed the v134 in-entry Calculate amount UI, preview, Apply action, and input/change listeners. The existing Food Entry form now matches v133: saved-food autofill, calorie/protein fields, servings shortcuts, date/t",
  "source": "CONTEXT"
 },
 {
  "version": "135",
  "title": "v135",
  "summary": "Food → Summary / Cooking: Two Food sub-tabs, preserving the existing food log, saved foods and food-entry editor unchanged in Summary. Cooking is a separate recipe workspace, not a fifth bottom tab. Recipe core: Create, edit and delete reusable recip",
  "source": "CONTEXT"
 },
 {
  "version": "134",
  "title": "v134",
  "summary": "Food and portion foundation (phase 1): Saved food editor has optional reference amount/unit, serving description, raw/cooked/drained/as-sold state, and known grams/milliliters equivalents. Both nutrition values always describe the same reference serv",
  "source": "CONTEXT"
 },
 {
  "version": "133",
  "title": "v133",
  "summary": "Money retired from Everyday UI: Four bottom tabs only — Home, Food, Lifting, Progress. Home's Eat/Workout switch and + control use a three-column row; the Spend dashboard and Money page/subroutes are unregistered. Old saved Home dashboard preference ",
  "source": "CONTEXT"
 },
 {
  "version": "132",
  "title": "v132",
  "summary": "Beginner one-to-two-set transition: If a routine exercise is planned for one set, reviewing that first finished set offers an optional, clearly labeled Start set 2 next to the normal Next exercise path. It extends only this session to two, never sile",
  "source": "CONTEXT"
 },
 {
  "version": "131",
  "title": "v131",
  "summary": "Every Food entry visible on the tab: The top selected-day Food card now lists all recorded entries, newest first, instead of stopping at three. The calorie/protein totals remain at the top of that card, and the full-log editor stays available as Edit",
  "source": "CONTEXT"
 },
 {
  "version": "130",
  "title": "v130",
  "summary": "Morning check-in from recent readings: The once-per-tracking-day prompt prefills each field independently from the latest saved measurement dated today or earlier, prioritizing yesterday when that is the latest. The caption says From yesterday, Last ",
  "source": "CONTEXT"
 },
 {
  "version": "129",
  "title": "v129",
  "summary": "Lifting routine cohesion: Replace the fixed-green native routine dropdown with horizontally scrolling, readable, color-coded routine buttons. Routines use their persisted, ID-stable individual colors (same as Home calendar markers and history cards),",
  "source": "CONTEXT"
 },
 {
  "version": "128",
  "title": "v128",
  "summary": "Workout Buddy Undo safety: Undo is always visible in its header with a 44px tap area, disabled only when no reversible action is available. It is no longer visually adjacent to the Exercises back button or duplicated in the set view. Opening Exercise",
  "source": "CONTEXT"
 },
 {
  "version": "127",
  "title": "v127",
  "summary": "Top Undo notice: A compact, palette-aware Food confirmation slides down just below the iPhone safe area, keeps its Undo action available for five seconds, and animates upward on expiration. It replaces the large green overlay over the bottom navigati",
  "source": "CONTEXT"
 },
 {
  "version": "126",
  "title": "v126",
  "summary": "Remaining theme typography: Added palette-derived informational/muted text coverage across Home's calorie/protein target denominators, Food suggestions and CSV help, the Home foods selection count, nutrition card captions, blank-state notices in Mone",
  "source": "CONTEXT"
 },
 {
  "version": "125",
  "title": "v125",
  "summary": "Set Levels now uses a rolling 8-day window: Today plus the preceding seven calendar dates, independent of the Friday work week or configured routine day. Applies to Progress, the Lifting routine preview and the Workout Buddy preview. No inflated plan",
  "source": "CONTEXT"
 },
 {
  "version": "124",
  "title": "v124",
  "summary": "Restore the approved muscle anatomy: Roll back the v123 internal chest/abs/quads/back/glute/hamstring/calf shapes and contours to exactly the v122 Natural Anatomy paths. The outer body silhouette was never changed. Keep the front/back views, existing",
  "source": "CONTEXT"
 },
 {
  "version": "123",
  "title": "v123",
  "summary": "Routine colors in the calendar: Future scheduled dates and completed session markers inherit their actual saved routine color where a routine is identifiable. Dotted rings remain planned, solid rings completed; history-only estimates and manually log",
  "source": "CONTEXT"
 },
 {
  "version": "122",
  "title": "Previous releases — v121–v122",
  "summary": "v121: Original Enchanted Forest surface hierarchy, reusable semantic colors, Appearance preview and temporary inspector. v122: Portfolio-aligned lowercase e. branding and refreshed PWA icons.",
  "source": "CONTEXT"
 },
 {
  "version": "121",
  "title": "Previous releases — v121–v122",
  "summary": "v121: Original Enchanted Forest surface hierarchy, reusable semantic colors, Appearance preview and temporary inspector. v122: Portfolio-aligned lowercase e. branding and refreshed PWA icons.",
  "source": "CONTEXT"
 },
 {
  "version": "120",
  "title": "v120",
  "summary": "Fourth and broader appearance audit: The v119 iPhone screenshots still showed green visual dividers in the Food log, green unselected color-palette borders, muted sage Workout Buddy \"workout in progress\" text, green paycheck detail labels, a green tr",
  "source": "CONTEXT"
 },
 {
  "version": "119",
  "title": "v119",
  "summary": "Third appearance pass — labels, badges and progress indicators: Following the v118 iPhone review, screenshots still showed green Workout Buddy completed/remaining section labels, exercise count and set-progress indicators, routine setup details, time",
  "source": "CONTEXT"
 },
 {
  "version": "118",
  "title": "v118",
  "summary": "Second screenshot-driven appearance audit: The user supplied 17 iPhone screenshots covering Home Eat/Workout/Spend, Food cards and planner, Progress trend/charts, Money transactions/paychecks, Lifting list/routine modal, Add Food form, and Workout Bu",
  "source": "CONTEXT"
 },
 {
  "version": "117",
  "title": "v117",
  "summary": "All-screen dark-palette coverage: v116 account palettes and skins were not recoloring multiple older hard-coded surfaces. The iPhone screenshot review showed mixed colors in Home totals/controls, Food cards, Lifting exercise cards, Progress charts, M",
  "source": "CONTEXT"
 },
 {
  "version": "116",
  "title": "v116",
  "summary": "Appearance gallery: Settings now includes subtle color palettes and optional decorative skins. The existing dark forest-green Everyday appearance remains the original default, labeled Enchanted Forest; blue is separately named Ocean at Night, never \"",
  "source": "CONTEXT"
 },
 {
  "version": "115",
  "title": "v115",
  "summary": "Money tab selector restored: The Overview screen again includes the exact same Overview / Transactions / Planning navigation control already shared by the other two Money screens. Two-week summary is one card: Toggling two weeks combines the two unde",
  "source": "CONTEXT"
 },
 {
  "version": "114",
  "title": "v114",
  "summary": "Paycheck-first Money setup: Fresh Finance accounts see a clear first step to add a payday, expected take-home amount and frequency. The setup button opens the existing reusable budget schedule form preselected to income / Paycheck / weekly, not the o",
  "source": "CONTEXT"
 },
 {
  "version": "113",
  "title": "v113",
  "summary": "Finance-only account reset in Settings: Reset Finance data offers an explicit red Delete all Finance data action with a disabled three-second countdown and Cancel option. The user must click again after the countdown. The app never resets anything au",
  "source": "CONTEXT"
 },
 {
  "version": "112",
  "title": "v112",
  "summary": "Firestore v3 month-partitioned account storage: account-monthly.js converts the normalized Everyday notebook to private account-level state/settings (goals, appearance, Home layout and prompt date), state/catalog (saved foods/favorite flags), state/r",
  "source": "CONTEXT"
 },
 {
  "version": "111",
  "title": "v111",
  "summary": "Money overview redesigned around a paycheck, not an inferred bank balance. Scrollable Money begins with 1 week / 2 weeks views anchored to existing weekly/biweekly payday schedules. Displays expected/received check, expanded individual scheduled bill",
  "source": "CONTEXT"
 },
 {
  "version": "110",
  "title": "v110",
  "summary": "Progress cleanup: Remove the duplicate full-page Individual weigh-ins and Body fat list sections; remove Workout timing's long explanatory paragraph. Do not delete measurement history. Keep compact Edit weigh-ins, Add body fat and Edit readings contr",
  "source": "CONTEXT"
 },
 {
  "version": "109",
  "title": "v109",
  "summary": "Progress weekly summaries: Remove the redundant six-week/BMI explanation beneath the weekly rows and omit repeated year labels from each week-count subtitle. Preserve the week range, weigh-in count, current-week marker, average weight, and BMI. Home ",
  "source": "CONTEXT"
 },
 {
  "version": "108",
  "title": "v108",
  "summary": "Workout Buddy warm-up: The bottom-right Dial was selected from v106's four clock previews. v108 removes the other previews and renders one large analog dial centered above the Start/Pause/Resume control. A wall-clock-driven second hand rotates six de",
  "source": "CONTEXT"
 },
 {
  "version": "107",
  "title": "v107",
  "summary": "v107 — shared Lifting and Workout Buddy exercise cards: v106's correct equipment SVG positioning beside the independent blue anatomy preview was accidentally scoped to #buddy-root .buddy-picker-screen. Generalize those same positioning and sizing rul",
  "source": "CONTEXT"
 },
 {
  "version": "106",
  "title": "v106",
  "summary": "v106 — Workout Buddy picker card art and bike clock previews: Reserve a square just to the left of each blue anatomy tile for the faded equipment SVG; neither artwork overlaps the other. Replace cable handle equipment SVG with a pulley-wheel design. ",
  "source": "CONTEXT"
 },
 {
  "version": "105",
  "title": "v105",
  "summary": "v105 — Workout Buddy layout consolidation. Picker uses a single 0/6 exercises (counting up) at top left, no redundant remaining count, no ready-to-lift/choose/description titles, and only short labels COMPLETED EXERCISES and REMAINING EXERCISES to se",
  "source": "CONTEXT"
 },
 {
  "version": "104",
  "title": "v104",
  "summary": "v104 — Workout Buddy Notes iPhone keyboard and completed-card editing. When the iOS keyboard opens in Workout Buddy, hide the bottom set/Next exercise button temporarily and allow scrolling to the active field; restore it when dismissed. Do not chang",
  "source": "CONTEXT"
 },
 {
  "version": "103",
  "title": "v103",
  "summary": "v103 — Workout Buddy iPhone corrections: “Completed sets” only lists confirmed sets: a set that has just finished its timer is still in review and must be excluded until the user advances (after finishing set 1: 0 rows; while reviewing set 2: 1 row).",
  "source": "CONTEXT"
 },
 {
  "version": "102",
  "title": "v102",
  "summary": "v102 — original button label typography/centering fix: User's iPhone screenshots confirmed that v101's Start set, Finish set, and Next exercise labels still appeared left-aligned and gray. Root cause: the ready/review action label was wrapped in a <s",
  "source": "CONTEXT"
 },
 {
  "version": "101",
  "title": "v101",
  "summary": "v101 — Workout Buddy iPhone feedback: Keep Start set, Finish set and Next exercise as full-width bottom buttons; restore the original button text's DM Sans family, weight and size, and center labels horizontally/vertically. Do not restore the previou",
  "source": "CONTEXT"
 },
 {
  "version": "100",
  "title": "Open work and candidate priorities — next cycle v96–v100",
  "summary": "These are candidates, NOT an agreed fixed release plan or automatic orders. Re-prioritize with the user's next request.",
  "source": "CONTEXT"
 },
 {
  "version": "99.7.17",
  "title": "v99.7.17 — Buddy anatomy, top set actions and Home Resume",
  "summary": "Workout Buddy's ready/review Start set N and Next exercise actions move to a compact top row alongside meaningful Undo controls and the live rest indicator. The redundant Undo start exercise is hidden when Exercises already provides the same navigati",
  "source": "README"
 },
 {
  "version": "99.7.16",
  "title": "v99.7.16 — prevent Workout Buddy Notes focus zoom",
  "summary": "Set the editable Notes textarea to 18px on iPhone (above Safari's 16px focus auto-zoom threshold), retaining normal manual pinch-to-zoom and accessible text scaling. On Done, blur the editor before it is replaced and then restore the Buddy keyboard v",
  "source": "README"
 },
 {
  "version": "99.7.15",
  "title": "v99.7.15 — compact Workout Buddy set actions and touch-origin mitigation",
  "summary": "Remove redundant Review set N, Set N of M, and Set N in progress secondary copy. A bottom action displays only Start set N, Finish set N or Next exercise. Retain graphical set indicators, accessible count, rest countdown, Undo, and timer. Remove obso",
  "source": "README"
 },
 {
  "version": "99.7.14",
  "title": "v99.7.14 — fix full food-log protein wrapping and progress alignment",
  "summary": "The All food entries modal now uses the same shared Food nutrition metric styling as the Food tab and Home. Before this patch the v99.7.11 scoped typography and inline-g rules did not apply to the modal, causing both protein units to wrap beneath the",
  "source": "README"
 },
 {
  "version": "99.7.13",
  "title": "v99.7.13 — optional body fat beside weight in the daily check-in",
  "summary": "The once-per-tracking-day weight prompt now displays side-by-side Weight and Body fat % (optional) inputs, sharing one date and Save action. Saving weight alone leaves body-fat records untouched. Entering body fat writes a separate body-fat measureme",
  "source": "README"
 },
 {
  "version": "99.7.12",
  "title": "v99.7.12 — screenshot-guided interface correction",
  "summary": "Retain six Home quick-add cards while restoring the standard Food cards' title size, macro band, edit control and accuracy icon. Keep front/back muscle SVGs as large as they fit in two separate padded columns, with no arm overlap, and center the Sche",
  "source": "README"
 },
 {
  "version": "99.7.11",
  "title": "v99.7.11 — shared nutrition metrics and quick-food cards",
  "summary": "Home and Food now render daily calories/protein with one shared numeric + progress-meter component. Font face, font size, units, goal text, bar height, width, top offset and left edge match exactly when switching Home ↔ Food. Each page retains its es",
  "source": "README"
 },
 {
  "version": "99.7.10",
  "title": "v99.7.10 — consistent bottom spacing across tabs",
  "summary": "Use Money's existing 18px bottom gap as the shared spacing between page content and the dock on Home, Food, Lifting, Money, Progress, History, and Settings. Home's full-height dashboard now ends above that reserved gutter instead of touching the dock",
  "source": "README"
 },
 {
  "version": "99.7.9",
  "title": "v99.7.9 — stable calorie/protein anchors between Home and Food",
  "summary": "Keep both daily calorie and protein values anchored to matching column positions and label/value heights when navigating Home → Food. Food retains its single full-card tap target, dark appearance and detailed log; Home retains its separate metric car",
  "source": "README"
 },
 {
  "version": "99.7.8",
  "title": "v99.7.8 — Native-menu viewport and shared routine cards",
  "summary": "Anchor layout to the viewport with a theme-matched background and normalize accidental document scroll on select/modal dismissal; check the reported black strip on iPhone. Reuse the colored routine-card component in Workout Buddy and Home; month arro",
  "source": "README"
 },
 {
  "version": "99.7.7",
  "title": "v99.7.7 — Home controls, stable dock and focused dates",
  "summary": "Context-menu viewport mitigation: absolute root plus native-select scroll normalization and theme-matched document background (iPhone verification pending). Month navigation buttons now have roughly double-width tap areas. The same colored routine-ch",
  "source": "README"
 },
 {
  "version": "99.7.6",
  "title": "v99.7.6 — Shared food-card visual refinement",
  "summary": "Food and Home share a two-zone card: readable multi-line name above and side-by-side calorie/protein figures below; no redundant Add instruction. The independent upper-right three-dot edit button keeps its own tap target and protected space so the fi",
  "source": "README"
 },
 {
  "version": "99.7.5",
  "title": "v99.7.5 — Stable iPhone dock, smaller calendar, six food cards per page",
  "summary": "Nav is always visible inside a single fixed app frame, avoiding a fixed body and select-focus rule that could create iPhone hit-test offsets. Verify on a real iPhone after native dropdowns and tab changes. Home Lifting uses a compact non-scrolling wo",
  "source": "README"
 },
 {
  "version": "99.7.4",
  "title": "v99.7.4 — Weekly workout schedule, recent sets and Home food pages",
  "summary": "Workout calendar supports recurring weekdays and optional saved-routine choices; configured schedule overrides historical projections. It is saved with Lifting data, and old backups remain compatible. The Home Lifting panel shows three last recorded ",
  "source": "README"
 },
 {
  "version": "99.7.3",
  "title": "v99.7.3 — Stable navigation, reusable calendar and food Plan",
  "summary": "Cloud/local saves update durability status without rebuilding screens; tab content scrolls inside a fixed shell with independently anchored bottom nav. Home top Food Add returns to Food after saving; Home quick-food cards remain on Home. Workout Budd",
  "source": "README"
 },
 {
  "version": "99.7.2",
  "title": "v99.7.2 — Fixed card order, Lifting glance and rest placement",
  "summary": "Home quick-food order remains fixed as foods are used. Customize now numbers selections in the order tapped, up to six. Lifting Home Add opens the saved routine picker again. The Lifting dashboard includes last-seven-day workout and set counts plus t",
  "source": "README"
 },
 {
  "version": "99.7.1",
  "title": "v99.7.1 — Navigation and usability patch",
  "summary": "Cloud save confirmations no longer rebuild new screens or active dialogs. Home Add directly opens Food, the selected Workout Buddy routine, or Spending; Food shows four automatic quick cards or up to six customized local cards.",
  "source": "README"
 },
 {
  "version": "99.7",
  "title": "v99.7 — Workout Buddy history, completed exercise cards and responsiveness",
  "summary": "History preview and active rest countdown share a two-column row. The rest timer remains visible on the right. Expanded history is a vertically scrollable area within the left panel, not a popover overlapping the timer or inputs; the existing small-v",
  "source": "CONTEXT"
 },
 {
  "version": "99.6",
  "title": "v99.6 — Interface declutter across Home, Food, Lifting, Finances, Progress",
  "summary": "Home: The full-height dashboard was sitting slightly behind iPhone bottom navigation. Reserve 82px plus iOS safe area rather than 66px, preserving the no-document-scroll dashboard design. Food: Remove large Food title, redundant \"Viewing\" above the d",
  "source": "CONTEXT"
 },
 {
  "version": "99.5",
  "title": "v99.5 — Home spacing, account banner and centered gear",
  "summary": "Reset only Home's two main <section> bottom margins, which inherited the old global 27px margin and caused a large unwanted gap above dashboard tabs. Explicit Home flex gap and single-viewport dashboard remain. Remove redundant standard account statu",
  "source": "CONTEXT"
 },
 {
  "version": "99.4.2",
  "title": "v99.4.2 — Home target typography hotfix",
  "summary": "Match the Food daily totals shown in the iPhone screenshot: calories/protein consumed stays large, while the inline slash and target are subdued 12px text. Keep the existing Home logged-value styling, both uppercase labels, progress bars, saved targe",
  "source": "CONTEXT"
 },
 {
  "version": "99.4.1",
  "title": "v99.4.1 — Home nutrition metric ratio hotfix",
  "summary": "On Home, show calories and protein as logged / target on one line, retaining the uppercase category label, current number typography/color, original protein unit treatment and each progress meter. Remove the redundant “of target · remaining/over” lin",
  "source": "CONTEXT"
 },
 {
  "version": "99.4",
  "title": "v99.4 — Streamlined Home and consistent header",
  "summary": "Home no longer shows three Food, Workout, and Spending shortcut tiles alongside three dashboard tabs and five section tabs. There is one + Add button aligned in the same row as the dashboard switcher; it opens a compact, accessible modal with Food, W",
  "source": "README"
 },
 {
  "version": "99.3",
  "title": "v99.3 — Design and copy refinement",
  "summary": "Preserve the large, single-card Home dashboard and the existing calories/protein goal descriptions. Tighten only the metrics, Home buttons and excess space above the header. Quick actions explicitly mean Log food, Start/Resume workout, Log spending, ",
  "source": "README"
 },
 {
  "version": "99.2",
  "title": "v99.2 — iPhone Home viewport and stale-app recovery",
  "summary": "Screenshot after the v99.1 Pages deployment showed the older v99 layout (oversized Food/Lifting cards, weight strip and account banner). This means the installed PWA had not loaded the newly published bundle; GitHub Pages publishing alone does not co",
  "source": "README"
 },
 {
  "version": "99.1",
  "title": "v99.1 — Home command center",
  "summary": "Daily calories/protein first, three coordinated SVG quick-action buttons beneath, no duplicate Home navigation tiles and no Home weight strip. Normal signed-in account management remains in Settings; sign-in/demo/offline controls and sync warnings re",
  "source": "README"
 },
 {
  "version": "99",
  "title": "v99 — Verification build",
  "summary": "Finances now opens to an Overview that distinguishes manually entered available cash from expected paychecks and planned bills. A 14-day upcoming-bill total and a conditional spending outlook make the important decisions easier to find. The outlook s",
  "source": "README"
 },
 {
  "version": "98.2",
  "title": "v98.2 — Full-application sanity pass",
  "summary": "Correct three-file storage reporting: Settings shows Nutrition, Lifting, and Finances as three independently measured UTF-8 JSON payloads (up to 800,000 bytes each), and diagnostics list the three sizes plus their uncapped combined total. The old sin",
  "source": "README"
 },
 {
  "version": "98.1",
  "title": "v98.1 — Three account JSON files",
  "summary": "Per-account cloud format: Nutrition, Lifting, and Finances are stored as three separate private Firestore JSON documents alongside an atomic revision manifest. Saving one notebook revision updates all three together. The old users/{uid}/state/main co",
  "source": "README"
 },
 {
  "version": "98",
  "title": "v98 — Everyday Budget and Native iOS groundwork",
  "summary": "Budget & cash flow: manual available-cash anchor, 35-day projections, minimum future cash and shortfall warnings, and read-only purchase scenarios. Schedule one-time, weekly, biweekly and monthly expenses/paydays with per-date Paid, Skipped and Undo ",
  "source": "README"
 },
 {
  "version": "97",
  "title": "v97 — Finance Spending Insights",
  "summary": "Finance now has a View spending insights page with All recorded dates, trailing 30/90 calendar days, and individual recorded months. All summaries are read-only and based on saved transaction classifications. Expenses, income/credits, bank-marked out",
  "source": "README"
 },
 {
  "version": "96",
  "title": "v96 — Reviewed finance classifications & merchant rules",
  "summary": "Finance can save reusable, disabled/enabled, editable and removable merchant rules for all bank-imported and manual transactions. Rules use case-insensitive text matching with optional exact amount; suggestions do not automatically change transaction",
  "source": "README"
 },
 {
  "version": "95",
  "title": "v95 — Workout Buddy interruption safety and next-cycle handoff",
  "summary": "An unfinished Workout Buddy Setup edit is now journaled as a recoverable setupDraft in the active workout on typing and on lifecycle interruption (background, pagehide, or exit). Reopening the active workout restores the draft in the editor. Only exp",
  "source": "README"
 },
 {
  "version": "94",
  "title": "v94 — iPhone keyboard and Setup editing",
  "summary": "Workout Buddy's Setup chip now opens an editable text field and focuses/selects it synchronously in the same tap rather than waiting for persistence first, so iOS can present its keyboard without requiring a second tap. The Notes editor likewise focu",
  "source": "README"
 },
 {
  "version": "93",
  "title": "v93 — Viewport-fitted Workout Buddy set screens",
  "summary": "Regular first- and later-set screens now use a compact fixed-height layout with no vertical page scrolling when the controls fit the available viewport. Spacing around the stationary anatomy diagram, previous history, resting clock, completed-set sum",
  "source": "README"
 },
 {
  "version": "92",
  "title": "v92 — Workout Buddy current-set inheritance and contextual undo",
  "summary": "Set 2 and later initialize weight, reps, and effort from the most recently completed set of the same exercise in the active workout, including corrections made during set review. Only the first set (or an exercise with no current completed set) uses ",
  "source": "README"
 },
 {
  "version": "91",
  "title": "v91 — Finance classification review queue",
  "summary": "Finances offers Review classifications when saved records need attention. Transaction History can filter by Needs review, Uncategorized, or Possible transfers. The possible-transfer hints reuse Bank of America's explicit payment and overdraft-transfe",
  "source": "README"
 },
 {
  "version": "90",
  "title": "v90 — Full Finance Transaction History and living development handoff",
  "summary": "Finances → View all transactions now opens a full history view of the saved financial ledger instead of only ten recent entries. Search considers the personal description, original bank description, merchant, category/subcategory, notes, itemization,",
  "source": "README"
 },
 {
  "version": "89",
  "title": "v89 — Reliable iOS resume logging and concise transaction rows",
  "summary": "Ordinary Food, Finance, workout, and measurement form submissions no longer silently fail when an iOS background/foreground transition leaves a cloud save pending or busy. They use the existing device recovery journal first; cloud-sync status remains",
  "source": "README"
 },
 {
  "version": "88",
  "title": "v88 — Finance import reliability",
  "summary": "Bank of America imports recognize explicit Discover E-PAYMENT, Online Scheduled Payment to ACCT#, and OVERDRAFT PROTECTION FROM entries as transfers rather than ordinary consumption/earned income. Savings transfers continue to use the original transf",
  "source": "README"
 },
 {
  "version": "87",
  "title": "v87 — Automatic Bank of America statement/batch labels",
  "summary": "In Finances → Import bank CSV, the Statement / batch label field is now automatically suggested when a Bank of America statement is selected. Everyday reads the actual beginning/ending balance dates in the CSV preamble, or falls back to the range of ",
  "source": "README"
 },
 {
  "version": "86",
  "title": "v86 — Bank of America $0.00 status-notice handling",
  "summary": "The direct Bank of America CSV reader now skips zero-dollar bank notices (including KEEP THE CHANGE TRANSFER CANCELED-LOW ACCT BALANCE) instead of rejecting the entire statement. Because those rows represent no movement of money, they are not saved a",
  "source": "README"
 },
 {
  "version": "85",
  "title": "v85 — Bank classification refinement",
  "summary": "Bank of America imports now preserve bankDirection (original debit or credit), separate from the editable kind classification (expense, income or transfer). The bank editor and ID-anchored enrichment CSV can correct that classification without rewrit",
  "source": "README"
 },
 {
  "version": "84",
  "title": "v84 — Bank of America imports, source-aware names, and ChatGPT clarification loop",
  "summary": "This is a dedicated finance pass before transaction-history development. In Finances → Bank statements, use Import bank CSV, assign an Account label (for example, BofA Checking) and a Statement / batch label (for example, October 2026 Checking), sele",
  "source": "README"
 },
 {
  "version": "83",
  "title": "v83 — Quick transaction logging and ChatGPT prepared CSV batches",
  "summary": "Finances is now usable. On the Finances tab, Quick Log puts amount and description first, with an expandable Type (expense/income/transfer), Category, actual calendar Date, optional Time, Merchant, and Note section. Each entry uses the validated posi",
  "source": "README"
 },
 {
  "version": "82",
  "title": "v82 — Financial transaction storage foundation",
  "summary": "Finances now has a durable transaction collection in the Everyday notebook; purchase logging and spending UI follow in later passes. Device-only and cloud accounts, offline JSON workspaces, cloud recovery copies, version-2 compact JSON encoding, full",
  "source": "README"
 },
 {
  "version": "81",
  "title": "v81 — Finances navigation foundation",
  "summary": "The bottom navigation now shows Home, Food, Lifting, Progress, and Finances. Settings is available from the compact gear beside the date in the top header on Home and all other main pages. Finances is an explicitly empty foundation for future transac",
  "source": "README"
 },
 {
  "version": "79",
  "title": "v79: Complete migration review availability and setup-preview accuracy",
  "summary": "The new Review & copy device notebook action remains available to accounts that used the older migration flow; the previous completion flag no longer hides workout records that earlier releases failed to copy. The preview includes exercise setups bei",
  "source": "README"
 },
 {
  "version": "78",
  "title": "v78: Previewed, non-destructive device-to-cloud migration",
  "summary": "Review & copy device notebook replaces the old one-tap transfer. It previews additions and skips for food, ordinary lifts, weigh-ins, body fat, custom exercise definitions, routine templates and saved Workout Buddy sessions, plus the active-workout d",
  "source": "README"
 },
 {
  "version": "77",
  "title": "v77: Complete lb/kg weight conversion",
  "summary": "Switching weight units in Settings now converts the complete notebook transactionally, not only weigh-ins and ordinary lift logs. The same conversion covers active Workout Buddy completed sets, the unsaved next-set draft, its saved undo snapshot, and",
  "source": "README"
 },
 {
  "version": "76",
  "title": "v76: Chronological routine history and shared exercise editing",
  "summary": "Saved Workout Buddy session detail now displays exercises by the first recorded set start time; if timestamps are missing, it falls back to the session's performedOrder and then stored order. History rendering preserves source indices rather than rew",
  "source": "README"
 },
 {
  "version": "75",
  "title": "v75: Undo transitions, per-set defaults, working muscle groups, and saved-set corrections",
  "summary": "Workout Buddy can undo Bike finished and Start exercise, and exposes its existing Start set undo while a set is active. Undo restores the warm-up completion flag and exercise performance order. On the next session, each set starts from the matching s",
  "source": "README"
 },
 {
  "version": "74",
  "title": "v74: Clear muscle-legend squares and no Buddy diagram overlap",
  "summary": "The Primary and Secondary legend indicators now match their rendered class names and display consistently sized terracotta/orange and blue squares. Workout Buddy retains its fixed anatomy thumbnail position between set preparation and active sets, bu",
  "source": "README"
 },
 {
  "version": "73.3",
  "title": "v73.3: Fixed-position muscle mini and understated movement labels",
  "summary": "Workout Buddy's miniature anatomy guide is anchored to the same coordinates in set preparation and active-set views; it no longer inherits their differing exercise-heading margins. A muted inline Push/Pull label appears beside equipment in canonical ",
  "source": "README"
 },
 {
  "version": "73.2",
  "title": "v73.2: Context-aware routine history navigation",
  "summary": "Tapping one of the three Recent routines on Lifting opens its detail directly and closing returns to Lifting. Opening the same routine through View all returns to the full routine-history list when closing detail. The full list then closes back to Li",
  "source": "README"
 },
 {
  "version": "73.1",
  "title": "v73.1: Routine history now shows the actual calendar date from session completion or end timestamp, retaining tracking-day data unchanged internally.",
  "summary": "",
  "source": "README"
 },
 {
  "version": "73",
  "title": "v73 — Mini muscle diagrams and completed routine history",
  "summary": "Lifting and Workout Buddy exercise cards now show tappable thumbnail front/back muscle highlights instead of the text Muscles button. A consistent miniature beside the exercise name appears before and during active sets in Workout Buddy and in the ro",
  "source": "README"
 },
 {
  "version": "72.1",
  "title": "v72.1 cache refresh",
  "summary": "The Workout Buddy guide fix also gets a new service-worker cache key and JS/CSS revision. This ensures devices that loaded the first v72 package fetch the corrected full-screen guide.",
  "source": "README"
 },
 {
  "version": "72",
  "title": "v72 — Body-map muscle reference",
  "summary": "Workout exercise cards, Workout Buddy's picker and its exercise screen, routine editor rows, and exercise Progress each link to the same locally rendered front/back muscle guide. A compact schematic highlights primary muscle groups in terracotta and ",
  "source": "README"
 },
 {
  "version": "71",
  "title": "v71 — Routine editor refinement",
  "summary": "The routine Add exercise picker now has + New exercise, which opens the same canonical Exercise Library editor used elsewhere. When saved, the new exercise is added to the unsaved routine draft, and its program settings can be edited normally. My rou",
  "source": "README"
 },
 {
  "version": "70",
  "title": "v70 — Routine management, first pass",
  "summary": "Lifting now includes a + Manage routine library with Use, Edit and Copy. Create routine offers Blank, Upper body, Lower body, Full body, Push day, Pull day and Leg day starter frameworks using the canonical Exercise Library and existing sets/reps/res",
  "source": "README"
 },
 {
  "version": "69",
  "title": "v69 — Batch food logging and less intrusive suggestions",
  "summary": "Choose Add another food to stage the current entry and immediately enter the next. The compact queue can be edited by removal and is only saved on Save foods. Untimed entries appear above timed entries. Suggest rest of day no longer shows date/time c",
  "source": "README"
 },
 {
  "version": "68",
  "title": "v68 — Simplification and true chronology",
  "summary": "Cruise Mode and associated day/travel/meal-memory notes have been removed from the app and backup payload. Old JSON backups still load, but retired fields are discarded. Food logs sort by actual date/time, newest first, while untimed entries come las",
  "source": "README"
 },
 {
  "version": "67",
  "title": "Entry time controls and Google sync meter",
  "summary": "Food entries, food suggestions, and reset-time settings now use one shared 30-minute ± time control instead of dropdowns. Optional time values have Now and No time shortcuts; the stored time format and selected calendar dates are unchanged. Time wrap",
  "source": "README"
 },
 {
  "version": "66",
  "title": "Exercise-card consistency",
  "summary": "The workout Add exercise picker now uses the same exerciseCardMarkup renderer as the other five exercise-card surfaces. Editable workout template rows retain their inputs but use the same push/pull classification and soft corner-to-card gradient, kee",
  "source": "README"
 },
 {
  "version": "65",
  "title": "Shared exercise cards and viewport polish",
  "summary": "Lifting, Workout Buddy picker, Exercise Library, and Progress use the same exerciseCardMarkup component. Equipment colors are shared; push/pull colors appear as translucent gradients strongest at the top-right corner, fading into the card, with small",
  "source": "README"
 },
 {
  "version": "64",
  "title": "Workout Buddy refinements",
  "summary": "After a set, its result stays editable and does not appear in Completed Sets until review ends. Start set saves edited values and immediately starts the next set's timer; the final set uses Next exercise. Tapping the last workout's two-set summary ex",
  "source": "README"
 },
 {
  "version": "63",
  "title": "Fixed demo dataset",
  "summary": "When signed out, Home and More provide Load demo data. This loads a fully fictional, deterministic 42-day notebook with saved foods, dated food entries (including a post-midnight entry), weigh-ins, body-fat readings, notes, lifting history, and compl",
  "source": "README"
 },
 {
  "version": "62",
  "title": "Workout Buddy refinements",
  "summary": "Buddy preserves its current look but switches to a focused in-set display with weight, reps, and a live set timer. Finish Set preserves the completed set immediately, then opens a post-set review during the rest countdown for corrections to weight, r",
  "source": "README"
 },
 {
  "version": "61",
  "title": "Logging refinements",
  "summary": "Food forms offer half-serving step controls and quick ½, 1, and 2 serving presets. A per-entry CSV toggle displays the current foodLog header/row or accepts one CSV food row to fill the form, without saving until confirmation. Quarterly/yearly nutrit",
  "source": "README"
 },
 {
  "version": "60",
  "title": "Online version checks and offline operation",
  "summary": "Every launch and return to the foreground checks version.json directly over the network (with caching disabled). When the published version is newer, Everyday refreshes to the latest app after active forms, workouts, imports, cloud saves, and offline",
  "source": "README"
 },
 {
  "version": "59",
  "title": "Food dates and tracking days",
  "summary": "A food entry's date is the actual calendar date eaten, and optional t is the local clock time in 30-minute slots (0–47). The site uses settings.dayResetMinutes to calculate which tracking day receives it. An entry with no time counts toward its calen",
  "source": "README"
 }
];
