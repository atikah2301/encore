import { supabase } from "./supabase-client.js";

const SELECT_COLUMNS = "id, title, venue_id, seen, date_seen, date_seen_precision, rating, companions, notes, booking_url, position, venues(name)";

export async function fetchHistory() {
  const { data, error } = await supabase
    .from("shows")
    .select(SELECT_COLUMNS)
    .eq("seen", true)
    .order("date_seen", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function fetchWishlist() {
  const { data, error } = await supabase
    .from("shows")
    .select(SELECT_COLUMNS)
    .eq("seen", false)
    .order("position");
  if (error) throw error;
  return data;
}

export async function addToWishlist({ title, venue_id, booking_url }) {
  const wishlist = await fetchWishlist();
  const nextPosition = wishlist.length ? Math.max(...wishlist.map((s) => s.position)) + 1 : 1;
  const { error } = await supabase
    .from("shows")
    .insert({ title, venue_id, booking_url, position: nextPosition });
  if (error) throw error;
}

export async function addToHistory({ title, venue_id, date_seen, date_seen_precision, rating, companions, notes }) {
  const { error } = await supabase
    .from("shows")
    .insert({ title, venue_id, seen: true, date_seen, date_seen_precision, rating, companions, notes });
  if (error) throw error;
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
 * the row drops out of `fetchWishlist`'s `where seen = false` query. */
export async function markAsSeen(id, { venue_id, date_seen, date_seen_precision, rating, companions, notes }) {
  await updateShow(id, {
    seen: true,
    venue_id,
    date_seen,
    date_seen_precision,
    rating,
    companions,
    notes,
    position: null,
  });
}

/** Renumbers every wishlist row's `position` to match `orderedIds`, in one batch of
 * updates. Called after any drag-reorder. */
export async function reorderWishlist(orderedIds) {
  await Promise.all(orderedIds.map((id, index) => updateShow(id, { position: index + 1 })));
}
