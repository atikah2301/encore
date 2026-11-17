import { supabase } from "./supabase-client.js";

const SELECT_COLUMNS =
  "id, title, venue_id, seen, date_seen, date_seen_precision, rating, notes, booking_url, position, " +
  "wishlist_status, on_sale_date, booked, booked_date, venues(name), " +
  "show_companions(companions(id, name))";

// Supabase returns the join as a nested array of wrapper objects
// (`show_companions: [{ companions: {id, name} }, ...]`) - flatten that into a plain
// `companions: [{id, name}, ...]` array so the rest of the app doesn't need to know
// about the join table shape.
function flattenCompanions(row) {
  const { show_companions, ...rest } = row;
  return { ...rest, companions: (show_companions ?? []).map((sc) => sc.companions) };
}

export async function fetchHistory() {
  const { data, error } = await supabase
    .from("shows")
    .select(SELECT_COLUMNS)
    .eq("seen", true)
    .order("date_seen", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data.map(flattenCompanions);
}

export async function fetchWishlist() {
  const { data, error } = await supabase
    .from("shows")
    .select(SELECT_COLUMNS)
    .eq("seen", false)
    .order("position");
  if (error) throw error;
  return data.map(flattenCompanions);
}

export async function addToWishlist({ title, venue_id, booking_url }) {
  const wishlist = await fetchWishlist();
  const nextPosition = wishlist.length ? Math.max(...wishlist.map((s) => s.position)) + 1 : 1;
  const { error } = await supabase
    .from("shows")
    .insert({ title, venue_id, booking_url, position: nextPosition });
  if (error) throw error;
}

export async function addToHistory({ title, venue_id, date_seen, date_seen_precision, rating, notes }) {
  const { data, error } = await supabase
    .from("shows")
    .insert({ title, venue_id, seen: true, date_seen, date_seen_precision, rating, notes })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateShow(id, fields) {
  const { error } = await supabase.from("shows").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteShow(id) {
  const { error } = await supabase.from("shows").delete().eq("id", id);
  if (error) throw error;
}

/** Flips a wishlist item into a seen show in place - a single UPDATE, since history and
 * wishlist are the same table (see supabase/migrations/README.md). Clears `position` so
 * the row drops out of `fetchWishlist`'s `where seen = false` query. Companions carry
 * over automatically since they're attached to the show row itself, not this update. */
export async function markAsSeen(id, { venue_id, date_seen, date_seen_precision, rating, notes }) {
  await updateShow(id, {
    seen: true,
    venue_id,
    date_seen,
    date_seen_precision,
    rating,
    notes,
    position: null,
  });
}

/** Renumbers every wishlist row's `position` to match `orderedIds`, in one batch of
 * updates. Called after any drag-reorder. */
export async function reorderWishlist(orderedIds) {
  await Promise.all(orderedIds.map((id, index) => updateShow(id, { position: index + 1 })));
}
