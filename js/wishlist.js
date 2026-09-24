import { fetchWishlist, addToWishlist, updateShow, reorderWishlist, deleteShow, markAsSeen } from "./shows.js";
import { fetchVenues, populateVenueSelect } from "./venues.js";
import { buildDateSeen } from "./date.js";
import { isDuplicateName } from "./duplicates.js";

let panelEl;
let venues = [];
let items = [];
let draggingId = null;

export async function initWishlistView(panel) {
  panelEl = panel;
  panelEl.innerHTML = `
    <form id="wishlist-add-form" class="card">
      <label for="wishlist-title">Show title</label>
      <input id="wishlist-title" type="text" required />
      <label for="wishlist-venue">Venue</label>
      <select id="wishlist-venue"></select>
      <label for="wishlist-booking-url">Booking link</label>
      <input id="wishlist-booking-url" type="url" placeholder="https://..." />
      <p id="wishlist-add-error" class="error-message" aria-live="polite" hidden></p>
      <button type="submit" class="primary">Add to wishlist</button>
    </form>
    <div id="wishlist-list"></div>

    <dialog id="mark-seen-dialog">
      <form id="mark-seen-form" class="card">
        <h2 id="mark-seen-title"></h2>
        <label for="mark-seen-venue">Venue</label>
        <select id="mark-seen-venue"></select>
        <label>Date seen (optional - day and month may be left blank)</label>
        <div class="field-row field-row-3">
          <input id="mark-seen-day" type="number" min="1" max="31" placeholder="Day" />
          <input id="mark-seen-month" type="number" min="1" max="12" placeholder="Month" />
          <input id="mark-seen-year" type="number" min="1900" max="2100" placeholder="Year" />
        </div>
        <label for="mark-seen-rating">Rating</label>
        <select id="mark-seen-rating">
          <option value="">— none —</option>
          <option value="1">★</option>
          <option value="2">★★</option>
          <option value="3">★★★</option>
          <option value="4">★★★★</option>
          <option value="5">★★★★★</option>
        </select>
        <label for="mark-seen-companions">Companions</label>
        <input id="mark-seen-companions" type="text" placeholder="Who did you go with?" />
        <label for="mark-seen-notes">Notes</label>
        <textarea id="mark-seen-notes" rows="4"></textarea>
        <button type="submit" class="primary">Mark as seen</button>
        <button type="button" id="mark-seen-cancel" class="secondary">Cancel</button>
      </form>
    </dialog>

    <dialog id="wishlist-edit-dialog">
      <form id="wishlist-edit-form" class="card">
        <h2>Edit wishlist item</h2>
        <label for="wishlist-edit-title">Show title</label>
        <input id="wishlist-edit-title" type="text" required />
        <label for="wishlist-edit-venue">Venue</label>
        <select id="wishlist-edit-venue"></select>
        <label for="wishlist-edit-booking-url">Booking link</label>
        <input id="wishlist-edit-booking-url" type="url" placeholder="https://..." />
        <p id="wishlist-edit-error" class="error-message" aria-live="polite" hidden></p>
        <button type="submit" class="primary">Save changes</button>
        <button type="button" id="wishlist-edit-cancel" class="secondary">Cancel</button>
      </form>
    </dialog>
  `;

  venues = await fetchVenues();
  populateVenueSelect(panelEl.querySelector("#wishlist-venue"), venues);

  panelEl.querySelector("#wishlist-add-form").addEventListener("submit", onAddSubmit);
  panelEl.querySelector("#mark-seen-form").addEventListener("submit", onMarkSeenSubmit);
  panelEl.querySelector("#mark-seen-cancel").addEventListener("click", closeMarkSeenDialog);
  panelEl.querySelector("#wishlist-edit-form").addEventListener("submit", onEditSubmit);
  panelEl.querySelector("#wishlist-edit-cancel").addEventListener("click", closeEditDialog);

  await refresh();
}

async function refresh() {
  items = await fetchWishlist();
  renderList();
}

function renderList() {
  const listEl = panelEl.querySelector("#wishlist-list");
  if (!items.length) {
    listEl.innerHTML = `<p class="hint">Nothing on the wishlist yet — add a show above.</p>`;
    return;
  }
  listEl.innerHTML = items
    .map(
      (item) => `
      <div class="wishlist-row card" draggable="true" data-id="${item.id}">
        <span class="drag-handle" aria-hidden="true">⠿</span>
        <div class="wishlist-row-body">
          <strong>${escapeHtml(item.title)}</strong>
          ${item.venues ? `<div class="hint">${escapeHtml(item.venues.name)}</div>` : ""}
          ${item.booking_url ? `<a href="${escapeHtml(item.booking_url)}" target="_blank" rel="noopener" class="hint">Booking link</a>` : ""}
        </div>
        <div class="wishlist-row-actions">
          <button type="button" class="secondary" data-action="seen" data-id="${item.id}">Mark as seen</button>
          <button type="button" class="secondary" data-action="edit" data-id="${item.id}">Edit</button>
          <button type="button" class="secondary" data-action="delete" data-id="${item.id}">Remove</button>
        </div>
      </div>`,
    )
    .join("");

  listEl.querySelectorAll(".wishlist-row").forEach((row) => {
    row.addEventListener("dragstart", onDragStart);
    row.addEventListener("dragover", onDragOver);
    row.addEventListener("dragend", onDragEnd);
    row.addEventListener("touchstart", onTouchStart, { passive: true });
    row.addEventListener("touchmove", onTouchMove, { passive: false });
    row.addEventListener("touchend", onTouchEnd);
  });
  listEl.querySelectorAll('[data-action="seen"]').forEach((btn) => {
    btn.addEventListener("click", () => openMarkSeenDialog(Number(btn.dataset.id)));
  });
  listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => onDelete(Number(btn.dataset.id)));
  });
  listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => openEditDialog(Number(btn.dataset.id)));
  });
}

// Drag reorder (mouse): native HTML5 drag-and-drop.
function onDragStart(event) {
  draggingId = Number(event.currentTarget.dataset.id);
  event.dataTransfer.setData("text/plain", String(draggingId));
  event.currentTarget.classList.add("dragging");
}

function onDragOver(event) {
  event.preventDefault();
  const row = event.currentTarget;
  const overId = Number(row.dataset.id);
  if (overId === draggingId) return;
  moveItem(draggingId, overId);
}

function onDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  draggingId = null;
  persistOrder();
}

// Drag reorder (touch): Pointer/touch events, since HTML5 drag-and-drop is unreliable
// on mobile browsers - this is the "reorder easily" requirement, and it needs to work
// well on a phone since that's where a wishlist is most likely to be checked/edited.
let touchStartY = 0;

function onTouchStart(event) {
  draggingId = Number(event.currentTarget.dataset.id);
  touchStartY = event.touches[0].clientY;
  event.currentTarget.classList.add("dragging");
}

function onTouchMove(event) {
  if (draggingId == null) return;
  event.preventDefault();
  const touchY = event.touches[0].clientY;
  const rows = [...panelEl.querySelectorAll(".wishlist-row")];
  const overRow = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return touchY >= rect.top && touchY <= rect.bottom;
  });
  if (overRow) {
    const overId = Number(overRow.dataset.id);
    if (overId !== draggingId) moveItem(draggingId, overId);
  }
  touchStartY = touchY;
}

function onTouchEnd(event) {
  event.currentTarget.classList.remove("dragging");
  draggingId = null;
  persistOrder();
}

function moveItem(movingId, overId) {
  const fromIndex = items.findIndex((i) => i.id === movingId);
  const toIndex = items.findIndex((i) => i.id === overId);
  if (fromIndex === -1 || toIndex === -1) return;
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  renderList();
}

async function persistOrder() {
  await reorderWishlist(items.map((i) => i.id));
}

async function onAddSubmit(event) {
  event.preventDefault();
  const title = panelEl.querySelector("#wishlist-title").value.trim();
  const venueId = panelEl.querySelector("#wishlist-venue").value;
  const bookingUrl = panelEl.querySelector("#wishlist-booking-url").value.trim();
  const errorEl = panelEl.querySelector("#wishlist-add-error");

  if (isDuplicateName(title, items.map((i) => i.title))) {
    errorEl.textContent = "This show is already on your wishlist.";
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;

  await addToWishlist({
    title,
    venue_id: venueId ? Number(venueId) : null,
    booking_url: bookingUrl || null,
  });
  event.target.reset();
  populateVenueSelect(panelEl.querySelector("#wishlist-venue"), venues);
  await refresh();
}

async function onDelete(id) {
  await deleteShow(id);
  await refresh();
}

let markSeenId = null;

function openMarkSeenDialog(id) {
  const item = items.find((i) => i.id === id);
  markSeenId = id;
  panelEl.querySelector("#mark-seen-title").textContent = item.title;
  populateVenueSelect(panelEl.querySelector("#mark-seen-venue"), venues, item.venue_id);
  panelEl.querySelector("#mark-seen-day").value = "";
  panelEl.querySelector("#mark-seen-month").value = "";
  panelEl.querySelector("#mark-seen-year").value = "";
  panelEl.querySelector("#mark-seen-rating").value = "";
  panelEl.querySelector("#mark-seen-companions").value = "";
  panelEl.querySelector("#mark-seen-notes").value = "";
  panelEl.querySelector("#mark-seen-dialog").showModal();
}

function closeMarkSeenDialog() {
  panelEl.querySelector("#mark-seen-dialog").close();
  markSeenId = null;
}

async function onMarkSeenSubmit(event) {
  event.preventDefault();
  const venueId = panelEl.querySelector("#mark-seen-venue").value;
  const day = panelEl.querySelector("#mark-seen-day").value;
  const month = panelEl.querySelector("#mark-seen-month").value;
  const year = panelEl.querySelector("#mark-seen-year").value;
  const rating = panelEl.querySelector("#mark-seen-rating").value;
  const companions = panelEl.querySelector("#mark-seen-companions").value.trim();
  const notes = panelEl.querySelector("#mark-seen-notes").value.trim();

  const { date_seen, date_seen_precision } = buildDateSeen(year, month, day);
  await markAsSeen(markSeenId, {
    venue_id: venueId ? Number(venueId) : null,
    date_seen,
    date_seen_precision,
    rating: rating ? Number(rating) : null,
    companions: companions || null,
    notes: notes || null,
  });
  closeMarkSeenDialog();
  await refresh();
}

let editingId = null;

function openEditDialog(id) {
  const item = items.find((i) => i.id === id);
  editingId = id;
  panelEl.querySelector("#wishlist-edit-title").value = item.title;
  populateVenueSelect(panelEl.querySelector("#wishlist-edit-venue"), venues, item.venue_id);
  panelEl.querySelector("#wishlist-edit-booking-url").value = item.booking_url || "";
  panelEl.querySelector("#wishlist-edit-error").hidden = true;
  panelEl.querySelector("#wishlist-edit-dialog").showModal();
}

function closeEditDialog() {
  panelEl.querySelector("#wishlist-edit-dialog").close();
  editingId = null;
}

async function onEditSubmit(event) {
  event.preventDefault();
  const title = panelEl.querySelector("#wishlist-edit-title").value.trim();
  const venueId = panelEl.querySelector("#wishlist-edit-venue").value;
  const bookingUrl = panelEl.querySelector("#wishlist-edit-booking-url").value.trim();
  const errorEl = panelEl.querySelector("#wishlist-edit-error");

  const otherTitles = items.filter((i) => i.id !== editingId).map((i) => i.title);
  if (isDuplicateName(title, otherTitles)) {
    errorEl.textContent = "This show is already on your wishlist.";
    errorEl.hidden = false;
    return;
  }

  await updateShow(editingId, {
    title,
    venue_id: venueId ? Number(venueId) : null,
    booking_url: bookingUrl || null,
  });
  closeEditDialog();
  await refresh();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
