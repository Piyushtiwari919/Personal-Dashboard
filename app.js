import { WIDGETS } from "./config.js";
import { initDailyFocus } from "./daily-focus.js";
import { initQuickLinks } from "./quick-links.js";
import { initFocusTimer } from "./focus-timer.js";

// -----------------------------------------------------------------------------
// Preferences (localStorage)
// -----------------------------------------------------------------------------

const STORAGE_KEY = "personal-dashboard-widget-visibility";

/** @returns {Record<string, boolean>} */
function getDefaultPreferences() {
  return Object.fromEntries(WIDGETS.map((w) => [w.id, w.defaultVisible]));
}

/**
 * Reads saved visibility flags. Falls back to config defaults if nothing
 * valid is stored yet.
 * @returns {Record<string, boolean>}
 */
function loadPreferences() {
  const defaults = getDefaultPreferences();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaults };
    }
    const parsed = JSON.parse(raw);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ...defaults };
    }
    const merged = { ...defaults };
    for (const id of Object.keys(defaults)) {
      if (typeof parsed[id] === "boolean") {
        merged[id] = parsed[id];
      }
    }
    return merged;
  } catch {
    // Corrupt or non-JSON data — behave like a first visit.
    return { ...defaults };
  }
}

/**
 * Persists the full visibility map. We always save the complete object so
 * partial updates cannot leave the store in an inconsistent shape.
 * @param {Record<string, boolean>} prefs
 */
function savePreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn("Could not save widget preferences:", e);
  }
}

/**
 * Applies visibility to widget cards. Using the `hidden` attribute keeps
 * layout semantics clear and removes nodes from the accessibility tree when off.
 * @param {Record<string, boolean>} prefs
 */
function applyWidgetVisibility(prefs) {
  for (const w of WIDGETS) {
    const card = document.querySelector(`[data-widget-id="${w.id}"]`);
    if (!card) continue;
    const visible = !!prefs[w.id];
    card.hidden = !visible;
    card.setAttribute("aria-hidden", visible ? "false" : "true");
  }
}

// -----------------------------------------------------------------------------
// Settings modal & iOS-style switches
// -----------------------------------------------------------------------------

const settingsModal = document.getElementById("settings-modal");
const settingsOpenBtn = document.getElementById("open-settings");
const settingsCloseBtn = document.getElementById("close-settings");
const settingsForm = document.getElementById("settings-form");

/** @type {HTMLElement | null} */
let lastFocusBeforeModal = null;

function isModalOpen() {
  return settingsModal?.classList.contains("is-open") ?? false;
}

/** Keep scroll lock if any dashboard modal is open (settings or quick-links add). */
function syncBodyModalOpen() {
  const settingsOpen = settingsModal?.classList.contains("is-open") ?? false;
  const quickAddOpen =
    document
      .getElementById("quick-links-add-modal")
      ?.classList.contains("is-open") ?? false;
  document.body.classList.toggle("modal-open", settingsOpen || quickAddOpen);
}

function openSettingsModal() {
  if (!settingsModal) return;
  lastFocusBeforeModal =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  settingsModal.classList.add("is-open");
  settingsModal.setAttribute("aria-hidden", "false");
  syncBodyModalOpen();
  const firstSwitch = settingsModal.querySelector('[role="switch"]');
  if (firstSwitch instanceof HTMLElement) {
    firstSwitch.focus();
  }
}

function closeSettingsModal() {
  if (!settingsModal) return;
  settingsModal.classList.remove("is-open");
  settingsModal.setAttribute("aria-hidden", "true");
  syncBodyModalOpen();
  if (lastFocusBeforeModal?.focus) {
    lastFocusBeforeModal.focus();
  }
}

/**
 * Builds one row per widget: label + switch (`role="switch"` for accessibility).
 * Clicks are handled via delegation on `#settings-form` (see init) so toggles
 * always stay in sync with `prefs` and work reliably with label + knob hits.
 * @param {Record<string, boolean>} prefs
 * @param {HTMLElement | null} form
 */
function renderSettingsToggles(prefs, form) {
  if (!form) return;
  form.innerHTML = "";
  for (const w of WIDGETS) {
    const row = document.createElement("div");
    row.className = "settings-row";

    const toggleId = `widget-toggle-${w.id}`;
    const label = document.createElement("label");
    label.className = "settings-label";
    label.htmlFor = toggleId;
    label.textContent = w.label;

    const switchBtn = document.createElement("button");
    switchBtn.type = "button";
    switchBtn.id = toggleId;
    switchBtn.className = "ios-switch";
    switchBtn.setAttribute("role", "switch");
    switchBtn.dataset.widgetId = w.id;
    switchBtn.setAttribute("aria-checked", prefs[w.id] ? "true" : "false");
    switchBtn.setAttribute(
      "aria-label",
      `Show ${w.label} widget on the dashboard`,
    );

    const knob = document.createElement("span");
    knob.className = "ios-switch-knob";
    knob.setAttribute("aria-hidden", "true");
    switchBtn.appendChild(knob);

    row.appendChild(label);
    row.appendChild(switchBtn);
    form.appendChild(row);
  }
}

/**
 * @param {Record<string, boolean>} prefs
 * @param {string} widgetId
 */
function toggleWidgetPreference(prefs, widgetId) {
  if (!Object.prototype.hasOwnProperty.call(prefs, widgetId)) return;
  const next = !prefs[widgetId];
  prefs[widgetId] = next;
  savePreferences(prefs);
  applyWidgetVisibility(prefs);
  const form = document.getElementById("settings-form");
  const btn = form?.querySelector(`.ios-switch[data-widget-id="${widgetId}"]`);
  if (btn) {
    btn.setAttribute("aria-checked", next ? "true" : "false");
  }
}

function onModalKeydown(e) {
  if (!isModalOpen() || !settingsModal) return;
  if (e.key === "Escape") {
    e.preventDefault();
    closeSettingsModal();
    return;
  }
  if (e.key !== "Tab") return;

  const focusables = settingsModal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  const list = Array.from(focusables).filter(
    (el) => el instanceof HTMLElement && !el.hasAttribute("disabled"),
  );
  if (list.length === 0) return;

  const first = list[0];
  const last = list[list.length - 1];
  const active = document.activeElement;

  if (e.shiftKey) {
    if (active === first || !settingsModal.contains(active)) {
      e.preventDefault();
      last.focus();
    }
  } else if (active === last) {
    e.preventDefault();
    first.focus();
  }
}

// -----------------------------------------------------------------------------
// Dashboard data (migrated from previous index.js)
// -----------------------------------------------------------------------------

function initClock() {
  const timeEl = document.querySelector(".time");
  if (!timeEl) return;
  const tick = () => {
    const time = new Date();
    timeEl.textContent = time.toLocaleTimeString("en-US", {
      timeStyle: "short",
    });
  };
  tick();
  setInterval(tick, 1000);
}

function initWeather() {
  const weatherCont = document.querySelector(".weather-widget-body");
  if (!weatherCont) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      fetch(
        `https://apis.scrimba.com/openweathermap/data/2.5/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&units=metric`,
      )
        .then((res) => res.json())
        .then((data) => {
          const temp = Math.round(data.main.temp);
          const icon = data.weather[0].icon;
          weatherCont.removeAttribute("aria-busy");
          weatherCont.innerHTML = `<p class="weather-line"><img src="https://openweathermap.org/img/wn/${icon}.png" alt="" width="40" height="40">${temp}°C</p>
            <p class="weather-city">${data.name}</p>`;
        })
        .catch((err) => {
          console.log(err);
          weatherCont.removeAttribute("aria-busy");
          weatherCont.innerHTML =
            '<p class="muted">Could not load weather.</p>';
        });
    },
    () => {
      weatherCont.removeAttribute("aria-busy");
      weatherCont.innerHTML =
        '<p class="muted">Location access denied or unavailable.</p>';
    },
  );
}

function initBackground() {
  fetch(
    "https://apis.scrimba.com/unsplash/photos/random?orientation=landscape&query=nature",
  )
    .then((res) => {
      if (!res.ok) throw new Error("Unsplash not available");
      return res.json();
    })
    .then((data) => {
      document.body.style.backgroundImage = `url(${data.urls.full})`;
      const authorP = document.querySelector(".author");
      if (authorP) {
        authorP.textContent = `Photo: ${data.user.name}`;
      }
    })
    .catch(() => {
      document.body.style.backgroundImage =
        "url(https://images.unsplash.com/photo-1483206048520-2321c1a5fb36?crop=entropy&cs=srgb&fm=jpg&ixid=M3wxNDI0NzB8MHwxfHJhbmRvbXx8fHx8fHx8fDE3NDQ2MTkyMDh8&ixlib=rb-4.0.3&q=85)";
    });
}

function initBitcoin() {
  const cryptoCont = document.querySelector(".crypto-widget-body");
  if (!cryptoCont) return;

  fetch("https://api.coingecko.com/api/v3/coins/bitcoin")
    .then((res) => {
      if (!res.ok) throw new Error("CoinGecko error");
      return res.json();
    })
    .then((data) => {
      cryptoCont.removeAttribute("aria-busy");
      cryptoCont.innerHTML = `<div class="img-cont"><img src="${data.image.small}" alt=""> ${data.name}</div>
        <p class="crypto-price">Current Price: ₹${data.market_data.current_price.inr}</p>
        <p class="crypto-price">High 24Hr: ₹${data.market_data.high_24h.inr}</p>
        <p class="crypto-price">Low 24Hr: ₹${data.market_data.low_24h.inr}</p>`;
    })
    .catch((err) => {
      console.log(err);
      cryptoCont.removeAttribute("aria-busy");
      cryptoCont.innerHTML =
        '<p class="muted">Could not load Bitcoin data.</p>';
    });
}

// -----------------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------------

function init() {
  const prefs = loadPreferences();
  applyWidgetVisibility(prefs);
  renderSettingsToggles(prefs, settingsForm);

  settingsOpenBtn?.addEventListener("click", openSettingsModal);
  settingsCloseBtn?.addEventListener("click", closeSettingsModal);

  settingsForm?.addEventListener("click", (e) => {
    const switchBtn = e.target?.closest?.(".ios-switch");
    if (
      !(switchBtn instanceof HTMLElement) ||
      !settingsForm.contains(switchBtn)
    ) {
      return;
    }
    const id = switchBtn.dataset.widgetId;
    if (!id) return;
    e.preventDefault();
    toggleWidgetPreference(prefs, id);
  });

  settingsModal?.addEventListener("click", (e) => {
    const panel = e.target?.closest?.(".modal-panel");
    if (!panel) {
      closeSettingsModal();
    }
  });

  document.addEventListener("keydown", onModalKeydown);

  initClock();
  initWeather();
  initBackground();
  initBitcoin();
  initDailyFocus();
  initQuickLinks({ syncBodyModalOpen });
  initFocusTimer();
}

init();
