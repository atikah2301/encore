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
