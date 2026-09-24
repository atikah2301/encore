import { fetchWishlist, addToWishlist, updateShow, reorderWishlist, deleteShow, markAsSeen } from "./shows.js";
import { fetchVenues, populateVenueSelect } from "./venues.js";
import { buildDateSeen, parseDateSeen, formatPlainDate, clampNumberInput, monthOptionsHtml } from "./date.js";
import { isDuplicateName } from "./duplicates.js";

// The wishlist is a kanban board: each show sits in exactly one column along the
// not-running -> planned production -> tickets-available -> booked timeline. Dragging a
// card to a new column changes its stage; dragging within a column just reorders it.
// `booked` is a separate flag from `wishlist_status` (see migrations README) so the
// "booked" column is really `booked ? "booked" : wishlist_status`.
const STAGES = [
  { key: "booked", title: "Booked", empty: "Nothing booked yet." },
  { key: "on_sale", title: "Tickets available", empty: "No tickets on sale yet." },
  { key: "announced", title: "Planned production", empty: "Nothing planned yet." },
  { key: "none", title: "Not running", empty: "Nothing waiting on this yet." },
];

function stageOf(item) {
  return item.booked ? "booked" : item.wishlist_status;
}

let panelEl;
let venues = [];
let items = [];

let draggingId = null;
let draggingOriginStage = null;
let dragOverStage = null;

export async function initWishlistView(panel) {
  panelEl = panel;
  panelEl.innerHTML = `
    <button type="button" id="add-wishlist-button" class="secondary">Add show</button>
    <div id="wishlist-board"></div>

    <dialog id="add-wishlist-dialog">
      <form id="wishlist-add-form" class="card">
        <h2>Add to wishlist</h2>
        <label for="wishlist-title">Show title</label>
        <input id="wishlist-title" type="text" required />
        <label for="wishlist-venue">Venue</label>
        <select id="wishlist-venue"></select>
        <label for="wishlist-booking-url">Booking link</label>
        <input id="wishlist-booking-url" type="url" placeholder="https://..." />
        <p id="wishlist-add-error" class="error-message" aria-live="polite" hidden></p>
        <button type="submit" class="primary">Add to wishlist</button>
        <button type="button" id="wishlist-add-cancel" class="secondary">Cancel</button>
      </form>
    </dialog>

    <dialog id="announce-dialog">
      <form id="announce-form" class="card">
        <h2>Planned production</h2>
        <p class="hint">Add an on-sale date if it's known yet - leave blank otherwise.</p>
        <label>On-sale date (optional)</label>
        <div class="field-row field-row-3">
          <input id="announce-day" type="number" min="1" max="31" placeholder="Day" />
          <select id="announce-month">${monthOptionsHtml()}</select>
          <input id="announce-year" type="number" min="1900" max="2100" placeholder="Year" />
        </div>
        <button type="submit" class="primary">Save</button>
        <button type="button" id="announce-cancel" class="secondary">Cancel</button>
      </form>
    </dialog>

    <dialog id="book-dialog">
      <form id="book-form" class="card">
        <h2>Booked!</h2>
        <label for="book-date">Date</label>
        <input id="book-date" type="date" required />
        <label for="book-companions">Companions</label>
        <input id="book-companions" type="text" placeholder="Who are you going with?" />
        <button type="submit" class="primary">Save</button>
        <button type="button" id="book-cancel" class="secondary">Cancel</button>
      </form>
    </dialog>

    <dialog id="mark-seen-dialog">
      <form id="mark-seen-form" class="card">
        <h2 id="mark-seen-title"></h2>
        <label for="mark-seen-venue">Venue</label>
        <select id="mark-seen-venue"></select>
        <label>Date seen (optional - day and month may be left blank)</label>
        <div class="field-row field-row-3">
          <input id="mark-seen-day" type="number" min="1" max="31" placeholder="Day" />
          <select id="mark-seen-month">${monthOptionsHtml()}</select>
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

  panelEl.querySelector("#add-wishlist-button").addEventListener("click", openAddDialog);
  panelEl.querySelector("#wishlist-add-form").addEventListener("submit", onAddSubmit);
  panelEl.querySelector("#wishlist-add-cancel").addEventListener("click", closeAddDialog);
  panelEl.querySelector("#announce-form").addEventListener("submit", onAnnounceSubmit);
  panelEl.querySelector("#announce-cancel").addEventListener("click", closeAnnounceDialog);
  panelEl.querySelector("#book-form").addEventListener("submit", onBookSubmit);
  panelEl.querySelector("#book-cancel").addEventListener("click", closeBookDialog);
  panelEl.querySelector("#mark-seen-form").addEventListener("submit", onMarkSeenSubmit);
  panelEl.querySelector("#mark-seen-cancel").addEventListener("click", closeMarkSeenDialog);
  panelEl.querySelector("#wishlist-edit-form").addEventListener("submit", onEditSubmit);
  panelEl.querySelector("#wishlist-edit-cancel").addEventListener("click", closeEditDialog);

  ["#announce-day", "#announce-year", "#mark-seen-day", "#mark-seen-year"].forEach((selector) =>
    clampNumberInput(panelEl.querySelector(selector)),
  );

  await refresh();
}

async function refresh() {
  items = await fetchWishlist();
  renderBoard();
}

function renderBoard() {
  const boardEl = panelEl.querySelector("#wishlist-board");
  boardEl.innerHTML = STAGES.map((stage) => {
    const stageItems = items.filter((item) => stageOf(item) === stage.key);
    return `
      <details class="kanban-column" open>
        <summary>${stage.title} <span class="kanban-count">${stageItems.length}</span></summary>
        <div class="kanban-column-body" data-stage="${stage.key}">
          ${stageItems.length ? stageItems.map(renderCard).join("") : `<p class="hint">${stage.empty}</p>`}
        </div>
      </details>`;
  }).join("");

  boardEl.querySelectorAll(".kanban-column-body").forEach((body) => {
    body.addEventListener("dragover", onColumnDragOver);
  });
  boardEl.querySelectorAll(".wishlist-row").forEach((row) => {
    row.addEventListener("dragstart", onDragStart);
    row.addEventListener("dragover", onCardDragOver);
    row.addEventListener("dragend", onDragEnd);
    row.addEventListener("touchstart", onTouchStart, { passive: true });
    row.addEventListener("touchmove", onTouchMove, { passive: false });
    row.addEventListener("touchend", onTouchEnd);
  });
  boardEl.querySelectorAll('[data-action="seen"]').forEach((btn) => {
    btn.addEventListener("click", () => openMarkSeenDialog(Number(btn.dataset.id)));
  });
  boardEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => onDelete(Number(btn.dataset.id)));
  });
  boardEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => openEditDialog(Number(btn.dataset.id)));
  });
}

function renderCard(item) {
  return `
    <div class="wishlist-row card" draggable="true" data-id="${item.id}">
      <span class="drag-handle" aria-hidden="true">⠿</span>
      <div class="wishlist-row-body">
        <strong>${escapeHtml(item.title)}</strong>
        ${item.venues ? `<div class="hint">${escapeHtml(item.venues.name)}</div>` : ""}
        ${item.on_sale_date ? `<div class="hint">On sale ${formatPlainDate(item.on_sale_date)}</div>` : ""}
        ${item.booked && item.booked_date ? `<div class="hint">Booked for ${formatPlainDate(item.booked_date)}</div>` : ""}
        ${item.booked && item.booked_companions ? `<div class="hint">With: ${escapeHtml(item.booked_companions)}</div>` : ""}
        ${item.booking_url ? `<a href="${escapeHtml(item.booking_url)}" target="_blank" rel="noopener" class="hint">Booking link</a>` : ""}
      </div>
      <div class="wishlist-row-actions">
        <button type="button" class="secondary" data-action="seen" data-id="${item.id}">Mark as seen</button>
        <button type="button" class="secondary" data-action="edit" data-id="${item.id}">Edit</button>
        <button type="button" class="secondary" data-action="delete" data-id="${item.id}">Remove</button>
      </div>
    </div>`;
}

// Drag (mouse): native HTML5 drag-and-drop. Only reordering within the same column
// happens live during drag; a move to a different column is applied on drop (see
// finishDrag), since it may need a dialog and shouldn't visibly commit until confirmed.
function onDragStart(event) {
  draggingId = Number(event.currentTarget.dataset.id);
  draggingOriginStage = stageOf(items.find((i) => i.id === draggingId));
  dragOverStage = draggingOriginStage;
  event.dataTransfer.setData("text/plain", String(draggingId));
  event.currentTarget.classList.add("dragging");
}

function onCardDragOver(event) {
  event.preventDefault();
  const overId = Number(event.currentTarget.dataset.id);
  const overStage = stageOf(items.find((i) => i.id === overId));
  dragOverStage = overStage;
  if (overStage !== draggingOriginStage || overId === draggingId) return;
  moveItem(draggingId, overId);
}

function onColumnDragOver(event) {
  event.preventDefault();
  dragOverStage = event.currentTarget.dataset.stage;
}

async function onDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  await finishDrag();
}

// Drag (touch): Pointer/touch events, since HTML5 drag-and-drop is unreliable on mobile
// browsers - this needs to work well on a phone since that's where the wishlist is most
// likely to be checked/updated.
function onTouchStart(event) {
  draggingId = Number(event.currentTarget.dataset.id);
  draggingOriginStage = stageOf(items.find((i) => i.id === draggingId));
  dragOverStage = draggingOriginStage;
  event.currentTarget.classList.add("dragging");
}

function onTouchMove(event) {
  if (draggingId == null) return;
  event.preventDefault();
  const touch = event.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  const columnBody = target?.closest(".kanban-column-body");
  if (!columnBody) return;
  dragOverStage = columnBody.dataset.stage;

  if (dragOverStage === draggingOriginStage) {
    const overRow = target.closest(".wishlist-row");
    if (overRow) {
      const overId = Number(overRow.dataset.id);
      if (overId !== draggingId) moveItem(draggingId, overId);
    }
  }
}

async function onTouchEnd(event) {
  event.currentTarget.classList.remove("dragging");
  await finishDrag();
}

function moveItem(movingId, overId) {
  const fromIndex = items.findIndex((i) => i.id === movingId);
  const toIndex = items.findIndex((i) => i.id === overId);
  if (fromIndex === -1 || toIndex === -1) return;
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  renderBoard();
}

async function persistOrder() {
  await reorderWishlist(items.map((i) => i.id));
}

// Ends the current drag: same-column drops just persist the reorder; cross-column drops
// change the item's stage, prompting for extra detail first when the target column needs it.
async function finishDrag() {
  const id = draggingId;
  const originStage = draggingOriginStage;
  const targetStage = dragOverStage;
  draggingId = null;
  draggingOriginStage = null;
  dragOverStage = null;
  if (id == null) return;

  if (targetStage === originStage) {
    await persistOrder();
    return;
  }

  if (targetStage === "announced") {
    openAnnounceDialog(id);
  } else if (targetStage === "booked") {
    openBookDialog(id);
  } else {
    await applyStageChange(id, targetStage);
    await refresh();
  }
}

/** Applies a stage change plus whatever extra detail that stage carries (an on-sale date
 * for "announced", a date+companions for "booked"). Clears fields that only make sense in
 * a stage the item is leaving, so switching stages doesn't leave stale detail behind. */
async function applyStageChange(id, targetStage, extra = {}) {
  const current = items.find((i) => i.id === id);
  await updateShow(id, {
    wishlist_status: targetStage === "booked" ? "on_sale" : targetStage,
    booked: targetStage === "booked",
    on_sale_date:
      targetStage === "none" || targetStage === "booked"
        ? null
        : extra.on_sale_date !== undefined
          ? extra.on_sale_date
          : current?.on_sale_date ?? null,
    booked_date: targetStage === "booked" ? extra.booked_date ?? null : null,
    booked_companions: targetStage === "booked" ? extra.booked_companions ?? null : null,
  });
}

let pendingMoveId = null;

function openAnnounceDialog(id) {
  pendingMoveId = id;
  panelEl.querySelector("#announce-day").value = "";
  panelEl.querySelector("#announce-month").value = "";
  panelEl.querySelector("#announce-year").value = "";
  panelEl.querySelector("#announce-dialog").showModal();
}

function closeAnnounceDialog() {
  panelEl.querySelector("#announce-dialog").close();
  pendingMoveId = null;
}

async function onAnnounceSubmit(event) {
  event.preventDefault();
  const day = panelEl.querySelector("#announce-day").value;
  const month = panelEl.querySelector("#announce-month").value;
  const year = panelEl.querySelector("#announce-year").value;
  const { date_seen } = buildDateSeen(year, month, day);
  await applyStageChange(pendingMoveId, "announced", { on_sale_date: date_seen });
  closeAnnounceDialog();
  await refresh();
}

function openBookDialog(id) {
  pendingMoveId = id;
  panelEl.querySelector("#book-date").value = "";
  panelEl.querySelector("#book-companions").value = "";
  panelEl.querySelector("#book-dialog").showModal();
}

function closeBookDialog() {
  panelEl.querySelector("#book-dialog").close();
  pendingMoveId = null;
}

async function onBookSubmit(event) {
  event.preventDefault();
  const bookedDate = panelEl.querySelector("#book-date").value;
  const companions = panelEl.querySelector("#book-companions").value.trim();
  await applyStageChange(pendingMoveId, "booked", { booked_date: bookedDate, booked_companions: companions || null });
  closeBookDialog();
  await refresh();
}

function openAddDialog() {
  panelEl.querySelector("#wishlist-add-form").reset();
  populateVenueSelect(panelEl.querySelector("#wishlist-venue"), venues);
  panelEl.querySelector("#wishlist-add-error").hidden = true;
  panelEl.querySelector("#add-wishlist-dialog").showModal();
}

function closeAddDialog() {
  panelEl.querySelector("#add-wishlist-dialog").close();
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
  closeAddDialog();
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
  const { year, month, day } = item.booked_date ? parseDateSeen(item.booked_date, "day") : {};
  panelEl.querySelector("#mark-seen-day").value = day || "";
  panelEl.querySelector("#mark-seen-month").value = month || "";
  panelEl.querySelector("#mark-seen-year").value = year || "";
  panelEl.querySelector("#mark-seen-rating").value = "";
  panelEl.querySelector("#mark-seen-companions").value = item.booked_companions || "";
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
