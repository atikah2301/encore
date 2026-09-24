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
