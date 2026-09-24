import { fetchHistory, addToHistory, updateShow, deleteShow } from "./shows.js";
import { fetchVenues, populateVenueSelect } from "./venues.js";
import { buildDateSeen, formatDateSeen, parseDateSeen } from "./date.js";
import { isDuplicateName } from "./duplicates.js";

let panelEl;
let venues = [];
let shows = [];

export async function initHistoryView(panel) {
  panelEl = panel;
  panelEl.innerHTML = `
    <form id="history-add-form" class="card">
      <label for="history-title">Show title</label>
      <input id="history-title" type="text" required />
      <label for="history-venue">Venue</label>
      <select id="history-venue"></select>
      <label>Date seen (optional - day and month may be left blank)</label>
      <div class="field-row field-row-3">
        <input id="history-day" type="number" min="1" max="31" placeholder="Day" />
        <input id="history-month" type="number" min="1" max="12" placeholder="Month" />
        <input id="history-year" type="number" min="1900" max="2100" placeholder="Year" />
      </div>
      <label for="history-rating">Rating</label>
      <select id="history-rating">
        <option value="">— none —</option>
        <option value="1">★</option>
        <option value="2">★★</option>
        <option value="3">★★★</option>
        <option value="4">★★★★</option>
        <option value="5">★★★★★</option>
      </select>
      <label for="history-companions">Companions</label>
      <input id="history-companions" type="text" placeholder="Who did you go with?" />
      <label for="history-notes">Notes</label>
      <textarea id="history-notes" rows="4"></textarea>
      <p id="history-add-error" class="error-message" aria-live="polite" hidden></p>
      <button type="submit" class="primary">Add to history</button>
    </form>
    <div id="history-list"></div>

    <dialog id="history-edit-dialog">
      <form id="history-edit-form" class="card">
        <h2 id="history-edit-title"></h2>
        <label for="history-edit-venue">Venue</label>
        <select id="history-edit-venue"></select>
        <label>Date seen (optional - day and month may be left blank)</label>
        <div class="field-row field-row-3">
          <input id="history-edit-day" type="number" min="1" max="31" placeholder="Day" />
          <input id="history-edit-month" type="number" min="1" max="12" placeholder="Month" />
          <input id="history-edit-year" type="number" min="1900" max="2100" placeholder="Year" />
        </div>
        <label for="history-edit-rating">Rating</label>
        <select id="history-edit-rating">
          <option value="">— none —</option>
          <option value="1">★</option>
          <option value="2">★★</option>
          <option value="3">★★★</option>
          <option value="4">★★★★</option>
          <option value="5">★★★★★</option>
        </select>
        <label for="history-edit-companions">Companions</label>
        <input id="history-edit-companions" type="text" placeholder="Who did you go with?" />
        <label for="history-edit-notes">Notes</label>
        <textarea id="history-edit-notes" rows="4"></textarea>
        <button type="submit" class="primary">Save changes</button>
        <button type="button" id="history-edit-cancel" class="secondary">Cancel</button>
      </form>
    </dialog>
  `;

  venues = await fetchVenues();
  populateVenueSelect(panelEl.querySelector("#history-venue"), venues);
  panelEl.querySelector("#history-add-form").addEventListener("submit", onAddSubmit);
  panelEl.querySelector("#history-edit-form").addEventListener("submit", onEditSubmit);
  panelEl.querySelector("#history-edit-cancel").addEventListener("click", closeEditDialog);

  await refresh();
}

async function refresh() {
  shows = await fetchHistory();
  renderList(shows);
}

function renderList(shows) {
  const listEl = panelEl.querySelector("#history-list");
  if (!shows.length) {
    listEl.innerHTML = `<p class="hint">No shows logged yet.</p>`;
    return;
  }
  listEl.innerHTML = shows
    .map((show) => {
      const dateLabel = formatDateSeen(show.date_seen, show.date_seen_precision);
      const stars = show.rating ? "★".repeat(show.rating) : "";
      return `
        <div class="card history-row">
          <div class="history-row-header">
            <strong>${escapeHtml(show.title)}</strong>
            <div class="history-row-actions">
              <button type="button" class="secondary" data-action="edit" data-id="${show.id}">Edit</button>
              <button type="button" class="secondary" data-action="delete" data-id="${show.id}">Remove</button>
            </div>
          </div>
          <div class="hint">
            ${[dateLabel, show.venues?.name, stars].filter(Boolean).join(" · ")}
          </div>
          ${show.companions ? `<div class="hint">With: ${escapeHtml(show.companions)}</div>` : ""}
          ${show.notes ? `<p>${escapeHtml(show.notes)}</p>` : ""}
        </div>`;
    })
    .join("");

  listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => onDelete(Number(btn.dataset.id)));
  });
  listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => openEditDialog(Number(btn.dataset.id)));
  });
}

async function onAddSubmit(event) {
  event.preventDefault();
  const title = panelEl.querySelector("#history-title").value.trim();
  const venueId = panelEl.querySelector("#history-venue").value;
  const day = panelEl.querySelector("#history-day").value;
  const month = panelEl.querySelector("#history-month").value;
  const year = panelEl.querySelector("#history-year").value;
  const rating = panelEl.querySelector("#history-rating").value;
  const companions = panelEl.querySelector("#history-companions").value.trim();
  const notes = panelEl.querySelector("#history-notes").value.trim();
  const errorEl = panelEl.querySelector("#history-add-error");

  if (isDuplicateName(title, shows.map((s) => s.title))) {
    errorEl.textContent = "This show is already in your history.";
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;

  const { date_seen, date_seen_precision } = buildDateSeen(year, month, day);
  await addToHistory({
    title,
    venue_id: venueId ? Number(venueId) : null,
    date_seen,
    date_seen_precision,
    rating: rating ? Number(rating) : null,
    companions: companions || null,
    notes: notes || null,
  });
  event.target.reset();
  populateVenueSelect(panelEl.querySelector("#history-venue"), venues);
  await refresh();
}

async function onDelete(id) {
  await deleteShow(id);
  await refresh();
}

let editingId = null;

function openEditDialog(id) {
  const show = shows.find((s) => s.id === id);
  editingId = id;
  panelEl.querySelector("#history-edit-title").textContent = show.title;
  populateVenueSelect(panelEl.querySelector("#history-edit-venue"), venues, show.venue_id);
  const { year, month, day } = parseDateSeen(show.date_seen, show.date_seen_precision);
  panelEl.querySelector("#history-edit-day").value = day || "";
  panelEl.querySelector("#history-edit-month").value = month || "";
  panelEl.querySelector("#history-edit-year").value = year || "";
  panelEl.querySelector("#history-edit-rating").value = show.rating || "";
  panelEl.querySelector("#history-edit-companions").value = show.companions || "";
  panelEl.querySelector("#history-edit-notes").value = show.notes || "";
  panelEl.querySelector("#history-edit-dialog").showModal();
}

function closeEditDialog() {
  panelEl.querySelector("#history-edit-dialog").close();
  editingId = null;
}

async function onEditSubmit(event) {
  event.preventDefault();
  const venueId = panelEl.querySelector("#history-edit-venue").value;
  const day = panelEl.querySelector("#history-edit-day").value;
  const month = panelEl.querySelector("#history-edit-month").value;
  const year = panelEl.querySelector("#history-edit-year").value;
  const rating = panelEl.querySelector("#history-edit-rating").value;
  const companions = panelEl.querySelector("#history-edit-companions").value.trim();
  const notes = panelEl.querySelector("#history-edit-notes").value.trim();

  const { date_seen, date_seen_precision } = buildDateSeen(year, month, day);
  await updateShow(editingId, {
    venue_id: venueId ? Number(venueId) : null,
    date_seen,
    date_seen_precision,
    rating: rating ? Number(rating) : null,
    companions: companions || null,
    notes: notes || null,
  });
  closeEditDialog();
  await refresh();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
