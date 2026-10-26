# Everyday fitness tracker

A small mobile-first web app for food, lifting, and body weight. The home screen has two primary actions. On the first visit after 6 a.m. local time each day, it offers a weigh-in with an **Enter later** option. A weigh-in already recorded for today suppresses the prompt.

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
