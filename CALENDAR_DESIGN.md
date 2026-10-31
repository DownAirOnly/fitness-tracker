# Everyday calendar design — reusable component

Source: `calendar-ui.js`, shared presentation rules: `styles.css` under `.ed-calendar`.

Use this design for future requests involving a month calendar unless explicitly asked for another style. Do **not** duplicate a bespoke grid or create separate calendar styling for each screen.

- A compact month heading with previous/next buttons; Sunday-first seven-column grid.
- Background matches the selected dark-green Home tab (#385844 in dark mode), and day numbers are white.
- A *recorded* workout: light-green outlined circle around the number (not a solid fill).
- A *projected* workout: dotted white outlined circle, never confused with a recorded workout.
- No marker is meaningful without source records or an explicitly explained estimate. A saved weekly schedule takes precedence over history-based spacing estimates; scheduled days remain dotted until a workout is logged.
- For compact Home dashboards, put the Schedule control in the calendar footer without an unnecessary status legend; keep month navigation in the title row and make the grid fit without scrolling.
- The calendar header can open an editable schedule with weekday-to-routine assignments. The schedule lives in the Lifting account data, not device-only layout preferences.
- Under workout calendars, the current design includes a two-day training-load anatomical overlay: red for muscles trained today, yellow for yesterday, unmarked otherwise. This is not physiological recovery measurement.

- Keep day buttons keyboard-focusable with accessible date and marker labels; visually distinguish today without adding a competing status circle.
- Host screens own data, month state, click handling, and the outcome of choosing a day. The shared component only renders.
- For Workout Calendar, source recorded days from workout history and lifts, and project only when past training intervals are consistent. All projections are estimates, not scheduled workouts.
- Render within the Home dashboard's internal scroller so the fixed bottom navigation is never displaced.
