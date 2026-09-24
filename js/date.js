const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Formats {date_seen, date_seen_precision} for display, respecting how much of the
 * date is actually known - e.g. "June 2024" when only year+month were entered. */
export function formatDateSeen(dateSeen, precision) {
  if (!dateSeen) return null;
  const [year, month, day] = dateSeen.split("-").map(Number);
  if (precision === "year") return `${year}`;
  if (precision === "month") return `${MONTHS[month - 1]} ${year}`;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Inverse of buildDateSeen - splits {date_seen, date_seen_precision} back into
 * separate year/month/day values for prefilling an edit form, leaving fields the
 * precision doesn't cover blank rather than showing the "01" placeholder default. */
export function parseDateSeen(dateSeen, precision) {
  if (!dateSeen) return { year: "", month: "", day: "" };
  const [year, month, day] = dateSeen.split("-").map(Number);
  if (precision === "year") return { year, month: "", day: "" };
  if (precision === "month") return { year, month, day: "" };
  return { year, month, day };
}

/** Formats a plain ISO date string (always full day-precision - used for forward-looking
 * dates like an on-sale date or a booking date, unlike the fuzzy `date_seen` field). */
export function formatPlainDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Clamps a number input to its own min/max as the user types, since browsers only
 * enforce min/max on the spinner arrows and form submission - not on typed input. */
export function clampNumberInput(el) {
  el.addEventListener("input", () => {
    if (el.value === "") return;
    const min = Number(el.min);
    const max = Number(el.max);
    const value = Number(el.value);
    if (value < min) el.value = String(min);
    else if (value > max) el.value = String(max);
  });
}

/** <option> markup for a month <select> - a fixed list of names rather than a number
 * input, so there's no way to type an out-of-range month. */
export function monthOptionsHtml() {
  return (
    `<option value="">Month</option>` +
    MONTHS.map((name, i) => `<option value="${i + 1}">${name}</option>`).join("")
  );
}

/** Builds a {date_seen, date_seen_precision} pair from separate year/month/day inputs,
 * where month/day may be blank - unknown parts default to "01" per the schema's
 * convention (see supabase/migrations README) so date_seen always sorts correctly. */
export function buildDateSeen(year, month, day) {
  if (!year) return { date_seen: null, date_seen_precision: null };
  const y = String(year).padStart(4, "0");
  if (!month) return { date_seen: `${y}-01-01`, date_seen_precision: "year" };
  const m = String(month).padStart(2, "0");
  if (!day) return { date_seen: `${y}-${m}-01`, date_seen_precision: "month" };
  const d = String(day).padStart(2, "0");
  return { date_seen: `${y}-${m}-${d}`, date_seen_precision: "day" };
}
