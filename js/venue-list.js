import { fetchVenues, addVenue } from "./venues.js";
import { isDuplicateName } from "./duplicates.js";

let panelEl;
let venues = [];

export async function initVenuesView(panel) {
  panelEl = panel;
  panelEl.innerHTML = `
    <button type="button" id="add-venue-button" class="secondary">Add venue</button>
    <div id="venues-list"></div>

    <dialog id="add-venue-dialog">
      <form id="add-venue-form" class="card">
        <h2>Add venue</h2>
        <label for="add-venue-name">Name</label>
        <input id="add-venue-name" type="text" required />
        <label for="add-venue-address">Address</label>
        <input id="add-venue-address" type="text" />
        <p id="add-venue-error" class="error-message" aria-live="polite" hidden></p>
        <button type="submit" class="primary">Add venue</button>
        <button type="button" id="add-venue-cancel" class="secondary">Cancel</button>
      </form>
    </dialog>
  `;

  panelEl.querySelector("#add-venue-button").addEventListener("click", openAddVenueDialog);
  panelEl.querySelector("#add-venue-form").addEventListener("submit", onAddSubmit);
  panelEl.querySelector("#add-venue-cancel").addEventListener("click", closeAddVenueDialog);

  await refresh();
}

async function refresh() {
  venues = await fetchVenues();
  renderList(venues);
}

function renderList(venues) {
  const listEl = panelEl.querySelector("#venues-list");
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

function openAddVenueDialog() {
  panelEl.querySelector("#add-venue-name").value = "";
  panelEl.querySelector("#add-venue-address").value = "";
  panelEl.querySelector("#add-venue-error").hidden = true;
  panelEl.querySelector("#add-venue-dialog").showModal();
}

function closeAddVenueDialog() {
  panelEl.querySelector("#add-venue-dialog").close();
}

async function onAddSubmit(event) {
  event.preventDefault();
  const name = panelEl.querySelector("#add-venue-name").value.trim();
  const address = panelEl.querySelector("#add-venue-address").value.trim();
  const errorEl = panelEl.querySelector("#add-venue-error");

  if (isDuplicateName(name, venues.map((v) => v.name))) {
    errorEl.textContent = "A venue with this name already exists.";
    errorEl.hidden = false;
    return;
  }

  await addVenue({ name, address: address || null });
  closeAddVenueDialog();
  await refresh();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
