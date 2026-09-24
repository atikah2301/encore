/** Case-insensitive check for whether `name` matches any name already in `existingNames`.
 * Shared by the venue, wishlist, and history "add" forms to catch accidental duplicates. */
export function isDuplicateName(name, existingNames) {
  const normalized = name.trim().toLowerCase();
  return existingNames.some((existing) => existing.trim().toLowerCase() === normalized);
}
