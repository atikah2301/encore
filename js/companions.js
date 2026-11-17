import { supabase } from "./supabase-client.js";

export async function fetchCompanions() {
  const { data, error } = await supabase.from("companions").select("id, name").order("name");
  if (error) throw error;
  return data;
}

export async function createCompanion(name) {
  const { data, error } = await supabase.from("companions").insert({ name }).select("id, name").single();
  if (error) throw error;
  return data;
}

/** Replaces a show's full set of companions with `companionIds` - the picker always
 * hands back the complete current selection, not a diff, so this is delete-then-insert
 * rather than trying to reconcile individual adds/removes. */
export async function setShowCompanions(showId, companionIds) {
  const { error: deleteError } = await supabase.from("show_companions").delete().eq("show_id", showId);
  if (deleteError) throw deleteError;
  if (!companionIds.length) return;
  const { error: insertError } = await supabase
    .from("show_companions")
    .insert(companionIds.map((companionId) => ({ show_id: showId, companion_id: companionId })));
  if (insertError) throw insertError;
}
