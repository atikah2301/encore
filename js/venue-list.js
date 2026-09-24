import { fetchVenues } from "./venues.js";

export async function initVenuesView(panel) {
  panel.innerHTML = `<div id="venues-list"></div>`;
  const listEl = panel.querySelector("#venues-list");

  const venues = await fetchVenues();
  if (!venues.length) {
    listEl.innerHTML = `<p class="hint">No venues yet.</p>`;
    return;
  }
  listEl.innerHTML = venues
    .map(
      (venue) => `
        <div class="card venue-row">
          <strong>${escapeHtml(venue.name)}</strong>
          ${venue.address ? `<div class="hint">${escapeHtml(venue.address)}</div>` : ""}
        </div>`,
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
