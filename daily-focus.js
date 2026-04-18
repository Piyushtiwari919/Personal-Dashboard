/**
 * Daily Focus — Rule of 3, midnight reset, localStorage
 * Storage shape: { date: "YYYY-MM-DD" (local), items: [{ id, text, completed }] }
 */
const STORAGE_KEY = "personal-dashboard-daily-focus";
const MAX_TASKS = 3;
const PLACEHOLDER_DEFAULT = "What are your top priorities today?";
const PLACEHOLDER_LOCKED = "Focus locked for today.";
const COMPLETE_TRANSITION_MS = 300;

/** @returns {string} Local calendar date YYYY-MM-DD */
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { date: todayKey(), items: [] };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { date: todayKey(), items: [] };
    }
    const date =
      typeof parsed.date === "string" ? parsed.date : todayKey();
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const cleaned = items
      .filter(
        (it) =>
          it &&
          typeof it.text === "string" &&
          typeof it.completed === "boolean"
      )
      .map((it) => ({
        id: typeof it.id === "string" ? it.id : crypto.randomUUID(),
        text: it.text.slice(0, 200),
        completed: it.completed,
      }));
    return { date, items: cleaned };
  } catch {
    return { date: todayKey(), items: [] };
  }
}

function applyMidnightReset(state) {
  const today = todayKey();
  if (state.date !== today) {
    state.date = today;
    state.items = [];
    persist(state);
  }
  return state;
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Daily Focus: could not save", e);
  }
}

function sortItemsForDisplay(items) {
  const incomplete = items.filter((i) => !i.completed);
  const complete = items.filter((i) => i.completed);
  return [...incomplete, ...complete];
}

function ariaForItem(text, completed) {
  return completed
    ? `Completed focus: ${text}. Press to mark incomplete.`
    : `Focus: ${text}. Press to mark complete.`;
}

export function initDailyFocus() {
  const input = document.getElementById("daily-focus-input");
  const emptyEl = document.getElementById("daily-focus-empty");
  const listEl = document.getElementById("daily-focus-list");
  if (!input || !emptyEl || !listEl) return;

  let state = applyMidnightReset(loadState());

  function updateInputLock() {
    const atCap = state.items.length >= MAX_TASKS;
    input.disabled = atCap;
    input.placeholder = atCap ? PLACEHOLDER_LOCKED : PLACEHOLDER_DEFAULT;
  }

  function updateEmptyState() {
    const hasItems = state.items.length > 0;
    emptyEl.hidden = hasItems;
    emptyEl.setAttribute("aria-hidden", hasItems ? "true" : "false");
  }

  function reorderListDom() {
    const sorted = sortItemsForDisplay(state.items);
    for (const item of sorted) {
      const li = listEl.querySelector(`[data-item-id="${item.id}"]`);
      if (li) listEl.appendChild(li);
    }
  }

  function buildRow(item) {
    const li = document.createElement("li");
    li.className = "daily-focus-item";
    li.dataset.itemId = item.id;
    if (item.completed) li.classList.add("is-complete");

    const check = document.createElement("button");
    check.type = "button";
    check.className = "focus-check";
    check.setAttribute("role", "checkbox");
    check.setAttribute("aria-checked", item.completed ? "true" : "false");
    check.setAttribute("aria-label", ariaForItem(item.text, item.completed));

    const box = document.createElement("span");
    box.className = "focus-check-box";
    box.setAttribute("aria-hidden", "true");
    check.appendChild(box);

    const label = document.createElement("span");
    label.className = "focus-text";
    label.textContent = item.text;

    const onActivate = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleItem(item.id);
    };

    check.addEventListener("click", onActivate);

    li.addEventListener("click", (e) => {
      if (e.target === check || check.contains(e.target)) return;
      toggleItem(item.id);
    });

    li.appendChild(check);
    li.appendChild(label);
    return li;
  }

  function renderFull() {
    listEl.innerHTML = "";
    const sorted = sortItemsForDisplay(state.items);
    for (const item of sorted) {
      listEl.appendChild(buildRow(item));
    }
    updateEmptyState();
    updateInputLock();
  }

  function toggleItem(id) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    item.completed = !item.completed;
    persist(state);

    const li = listEl.querySelector(`[data-item-id="${id}"]`);
    const check = li?.querySelector(".focus-check");
    if (li && check) {
      li.classList.toggle("is-complete", item.completed);
      check.setAttribute("aria-checked", item.completed ? "true" : "false");
      check.setAttribute("aria-label", ariaForItem(item.text, item.completed));
    }

    window.setTimeout(() => reorderListDom(), COMPLETE_TRANSITION_MS);
    updateInputLock();
  }

  function addTask(text) {
    const t = text.trim();
    if (!t || state.items.length >= MAX_TASKS) return;
    state.items.push({
      id: crypto.randomUUID(),
      text: t,
      completed: false,
    });
    persist(state);
    input.value = "";
    renderFull();
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask(input.value);
    }
  });

  updateInputLock();
  updateEmptyState();
  renderFull();
}
