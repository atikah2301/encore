import { supabase } from "./supabase-client.js";

export async function fetchVenues() {
  const { data, error } = await supabase.from("venues").select("id, name, address").order("name");
  if (error) throw error;
  return data;
}

export async function addVenue({ name, address }) {
  const { error } = await supabase.from("venues").insert({ name, address });
  if (error) throw error;
}

export async function updateVenue(id, { name, address }) {
  const { error } = await supabase.from("venues").update({ name, address }).eq("id", id);
  if (error) throw error;
}

/** Whether any show (history or wishlist) references this venue - used to block
 * deleting a venue that's still in use, since the DB has no cascade for this. */
export async function isVenueInUse(id) {
  const { count, error } = await supabase
    .from("shows")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", id);
  if (error) throw error;
  return count > 0;
}

export async function deleteVenue(id) {
  const { error } = await supabase.from("venues").delete().eq("id", id);
  if (error) throw error;
}

/** Populates a <select> with a blank "no venue" option followed by every venue,
 * since picking a venue is optional on every form that uses this. */
export function populateVenueSelect(selectEl, venues, selectedId = null) {
  selectEl.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "— none —";
  selectEl.appendChild(blank);
  for (const venue of venues) {
    const option = document.createElement("option");
    option.value = venue.id;
    option.textContent = venue.name;
    selectEl.appendChild(option);
  }
  selectEl.value = selectedId ?? "";
}
