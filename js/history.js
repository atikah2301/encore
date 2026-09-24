import { fetchHistory, addToHistory, deleteShow } from "./shows.js";
import { fetchVenues, populateVenueSelect } from "./venues.js";
import { buildDateSeen, formatDateSeen } from "./date.js";

let panelEl;
let venues = [];

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
      <button type="submit" class="primary">Add to history</button>
    </form>
    <div id="history-list"></div>
  `;

  venues = await fetchVenues();
  populateVenueSelect(panelEl.querySelector("#history-venue"), venues);
  panelEl.querySelector("#history-add-form").addEventListener("submit", onAddSubmit);

  await refresh();
}

async function refresh() {
  const shows = await fetchHistory();
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
            <button type="button" class="secondary" data-action="delete" data-id="${show.id}">Remove</button>
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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
