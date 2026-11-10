// Read only the newest measurement on or before the requested tracking day.
// Weight and body fat are independent; neither series fills gaps in the other.
export function checkInReading(entries, day) {
  if (!Array.isArray(entries) || !day) return null;
  return entries
    .filter(entry => typeof entry?.date === 'string' && entry.date <= day && Number.isFinite(entry.value) && entry.value > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

// Buttons operate on draft form values, never on stored measurements.
export function stepCheckInValue(raw, step, kind = 'weight') {
  if (String(raw ?? '').trim() === '') return null;
  const value = Number(raw);
  const delta = Number(step);
  if (!Number.isFinite(value) || value <= 0 || ![-0.5, -0.1, 0.1, 0.5].includes(delta)) return null;
  const tenths = Math.round(value * 10) + Math.round(delta * 10);
  if (tenths < 1 || (kind === 'bodyFat' && tenths > 1000)) return null;
  return (tenths / 10).toFixed(1);
}
