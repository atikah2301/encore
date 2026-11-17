import { createCompanion } from "./companions.js";

/** Markup for a companion picker, keyed by `idPrefix` so multiple pickers (e.g. an add
 * dialog and an edit dialog) can coexist on the same page without id collisions. */
export function companionPickerHtml(idPrefix) {
  return `
    <div class="companion-picker" id="${idPrefix}-picker">
      <input type="text" class="companion-picker-input" placeholder="Type a name..." autocomplete="off" />
      <div class="companion-picker-dropdown" hidden></div>
      <div class="companion-picker-tags"></div>
    </div>`;
}

/** Wires up a typeahead multi-select for companions inside `rootEl`, which must contain
 * elements with classes `companion-picker-input`, `companion-picker-dropdown`, and
 * `companion-picker-tags` (see the markup in history.js/wishlist.js).
 *
 * `allCompanions` is a shared, mutable array of {id, name} covering every companion that
 * exists - selecting "create new" pushes the new companion into it directly, so any other
 * picker on the same page (e.g. add vs. edit dialogs) immediately offers it too. */
export function initCompanionPicker(rootEl, allCompanions, initialSelected = []) {
  const inputEl = rootEl.querySelector(".companion-picker-input");
  const dropdownEl = rootEl.querySelector(".companion-picker-dropdown");
  const tagsEl = rootEl.querySelector(".companion-picker-tags");

  let selected = [...initialSelected];

  function renderTags() {
    tagsEl.innerHTML = selected
      .map(
        (c) =>
          `<span class="companion-tag">${escapeHtml(c.name)}` +
          `<button type="button" data-id="${c.id}" aria-label="Remove ${escapeHtml(c.name)}">&times;</button></span>`,
      )
      .join("");
    tagsEl.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        selected = selected.filter((c) => c.id !== Number(btn.dataset.id));
        renderTags();
      });
    });
  }

  function closeDropdown() {
    dropdownEl.hidden = true;
    dropdownEl.innerHTML = "";
  }

  function openDropdown(query) {
    const lower = query.trim().toLowerCase();
    if (!lower) {
      closeDropdown();
      return;
    }
    const selectedIds = new Set(selected.map((c) => c.id));
    const matches = allCompanions.filter(
      (c) => !selectedIds.has(c.id) && c.name.toLowerCase().includes(lower),
    );
    const exactMatch = allCompanions.some((c) => c.name.toLowerCase() === lower);

    const options = matches
      .map((c) => `<div class="companion-option" data-action="select" data-id="${c.id}">${escapeHtml(c.name)}</div>`)
      .join("");
    const createOption = exactMatch
      ? ""
      : `<div class="companion-option" data-action="create">Create "${escapeHtml(query.trim())}"</div>`;

    dropdownEl.innerHTML = options + createOption;
    dropdownEl.hidden = false;

    dropdownEl.querySelectorAll('[data-action="select"]').forEach((el) => {
      el.addEventListener("click", () => {
        const companion = allCompanions.find((c) => c.id === Number(el.dataset.id));
        selectCompanion(companion);
      });
    });
    const createEl = dropdownEl.querySelector('[data-action="create"]');
    if (createEl) {
      createEl.addEventListener("click", () => createAndSelect(query.trim()));
    }
  }

  function selectCompanion(companion) {
    if (!selected.some((c) => c.id === companion.id)) {
      selected.push(companion);
      renderTags();
    }
    inputEl.value = "";
    closeDropdown();
    inputEl.focus();
  }

  async function createAndSelect(name) {
    if (!name) return;
    const existing = allCompanions.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const companion = existing || (await createCompanion(name));
    if (!existing) allCompanions.push(companion);
    selectCompanion(companion);
  }

  inputEl.addEventListener("input", () => openDropdown(inputEl.value));
  inputEl.addEventListener("focus", () => {
    if (inputEl.value.trim()) openDropdown(inputEl.value);
  });
  inputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = inputEl.value.trim();
    if (!value) return;
    const exact = allCompanions.find((c) => c.name.toLowerCase() === value.toLowerCase());
    if (exact) selectCompanion(exact);
    else createAndSelect(value);
  });
  // Closing on blur needs a delay so a click on a dropdown option (which blurs the
  // input first) still registers before the dropdown gets torn down.
  inputEl.addEventListener("blur", () => setTimeout(closeDropdown, 150));

  renderTags();

  return {
    getSelectedIds: () => selected.map((c) => c.id),
    reset(newSelected = []) {
      selected = [...newSelected];
      inputEl.value = "";
      closeDropdown();
      renderTags();
    },
  };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
