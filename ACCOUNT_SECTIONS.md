# Everyday v98.1 section JSON contract

**Use this exact format for conversion of an existing complete Everyday backup.** There are three independent `.json` files. No source bank facts, transaction kinds, quantities, workouts, dates, IDs, settings or notes should be edited as part of the split.

Each file is an ordinary JSON object with exactly three top-level keys: `format`, `section`, and `data`. The `format` value is always `everyday-section-v1`. The `section` is exactly `nutrition`, `lifting`, or `finances`. The `data` object contains the named fields below and no other keys. All named fields must be present, even when their values are empty.

## Nutrition — `everyday-nutrition.json`

`data` contains `settings`, `foods`, `foodEntries`, `weights`, `bodyFat`, and `promptDate`.

**Important:** The body-weight unit and height live in Nutrition `settings` and are also used by Lifting and Progress. Keep their values unchanged. Nutrition may include weight and body-fat measurements because the user requested only three files, not a fourth Progress file.

## Lifting — `everyday-lifting.json`

`data` contains `exerciseDefinitions`, `workoutTemplates`, `lifts`, `activeWorkout`, and `workoutHistory`. Preserve exercise, routine and Workout Buddy IDs and links. Preserve an active session exactly as it was exported; no rescheduling or inferred completed sets.

## Finances — `everyday-finances.json`

`data` contains `transactions`, `classificationRules`, and `budgetPlan`. Preserve original immutable bank information, classification edits, merchant rules, statement labels, transaction IDs, and financial assumptions exactly. Do not merge, deduplicate or reclassify transactions.

## Empty and legacy fields

- For a legacy backup without `transactions` or `classificationRules`, use empty arrays.
- For a legacy backup without `budgetPlan`, use `{"balanceCents":null,"balanceAsOf":"","categoryLimits":[],"schedules":[]}`.
- For a legacy backup without `bodyFat` or `workoutHistory`, use empty arrays. Without an `activeWorkout`, use `null`.
- The complete existing backup is still useful as an independent emergency backup; do not delete it.
- If the original file is compact `version:2` with abbreviated workout/food content, decode it through the current app model before converting instead of manually guessing values. The app's `Export Nutrition/Lifting/Finances JSON` buttons also create the correct files directly from a loaded notebook.

## Import behavior

In Everyday Settings → Import & backup → Import separate JSON files, select one, two or all three files. Every selected section is a **complete replacement** of that section; unselected sections remain unchanged. Review the preview and confirm. Don't import a partially converted file. Save a full combined JSON first.

## Cloud account storage (requires security rules)

Firestore stores `state/nutrition`, `state/lifting`, and `state/finances` as separate private versioned JSON payload documents. `state/manifest` provides a shared revision. A successful save is atomic across all four documents. Existing `state/main` is read as a migration source and is **not deleted**. Before deploying the v98.1 browser client, publish the new `firestore.rules` in Firebase Console so the browser can access the new document paths.

After a converted import, compare original and current food, nutrition, weight, lifting, workout, bank, classification-rule and budget counts and several stable IDs. A different count is a stop signal, not permission to overwrite.
