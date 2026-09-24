import { fetchVenues, addVenue, updateVenue, isVenueInUse, deleteVenue } from "./venues.js";
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

    <dialog id="venue-edit-dialog">
      <form id="venue-edit-form" class="card">
        <h2>Edit venue</h2>
        <label for="venue-edit-name">Name</label>
        <input id="venue-edit-name" type="text" required />
        <label for="venue-edit-address">Address</label>
        <input id="venue-edit-address" type="text" />
        <p id="venue-edit-error" class="error-message" aria-live="polite" hidden></p>
        <button type="submit" class="primary">Save changes</button>
        <button type="button" id="venue-edit-delete" class="secondary">Delete venue</button>
        <button type="button" id="venue-edit-cancel" class="secondary">Cancel</button>
      </form>
    </dialog>
  `;

  panelEl.querySelector("#add-venue-button").addEventListener("click", openAddVenueDialog);
  panelEl.querySelector("#add-venue-form").addEventListener("submit", onAddSubmit);
  panelEl.querySelector("#add-venue-cancel").addEventListener("click", closeAddVenueDialog);
  panelEl.querySelector("#venue-edit-form").addEventListener("submit", onEditSubmit);
  panelEl.querySelector("#venue-edit-cancel").addEventListener("click", closeEditDialog);
  panelEl.querySelector("#venue-edit-delete").addEventListener("click", onDelete);

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
          <div class="venue-row-header">
            <strong>${escapeHtml(venue.name)}</strong>
            <button type="button" class="secondary" data-action="edit" data-id="${venue.id}">Edit</button>
          </div>
          ${venue.address ? `<div class="hint">${escapeHtml(venue.address)}</div>` : ""}
        </div>`,
    )
    .join("");

  listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => openEditDialog(Number(btn.dataset.id)));
  });
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

let editingId = null;

function openEditDialog(id) {
  const venue = venues.find((v) => v.id === id);
  editingId = id;
  panelEl.querySelector("#venue-edit-name").value = venue.name;
  panelEl.querySelector("#venue-edit-address").value = venue.address || "";
  panelEl.querySelector("#venue-edit-error").hidden = true;
  panelEl.querySelector("#venue-edit-dialog").showModal();
}

function closeEditDialog() {
  panelEl.querySelector("#venue-edit-dialog").close();
  editingId = null;
}

async function onEditSubmit(event) {
  event.preventDefault();
  const name = panelEl.querySelector("#venue-edit-name").value.trim();
  const address = panelEl.querySelector("#venue-edit-address").value.trim();
  const errorEl = panelEl.querySelector("#venue-edit-error");

  const otherNames = venues.filter((v) => v.id !== editingId).map((v) => v.name);
  if (isDuplicateName(name, otherNames)) {
    errorEl.textContent = "A venue with this name already exists.";
    errorEl.hidden = false;
    return;
  }

  await updateVenue(editingId, { name, address: address || null });
  closeEditDialog();
  await refresh();
}

async function onDelete() {
  const errorEl = panelEl.querySelector("#venue-edit-error");
  if (await isVenueInUse(editingId)) {
    errorEl.textContent = "This venue is linked to a show and can't be deleted.";
    errorEl.hidden = false;
    return;
  }

  await deleteVenue(editingId);
  closeEditDialog();
  await refresh();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
