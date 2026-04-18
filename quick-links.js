
const STORAGE_KEY = "personal-dashboard-quick-links";

/** Neutral fallback when URL/domain is invalid or favicon fails to load */
const PLACEHOLDER_FAVICON =
  "https://www.google.com/s2/favicons?domain=example.com&sz=128";

/**
 * @param {string} pageUrl normalized href
 */
export function getFaviconUrl(pageUrl) {
  try {
    const u = new URL(pageUrl);
    if (!u.hostname) return PLACEHOLDER_FAVICON;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      u.hostname
    )}&sz=128`;
  } catch {
    return PLACEHOLDER_FAVICON;
  }
}

/**
 * @param {string} input
 * @returns {string | null}
 */
export function normalizeUrl(input) {
  const raw = (input || "").trim();
  if (!raw) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProtocol);
    if (!u.hostname) return null;
    return u.href;
  } catch {
    return null;
  }
}

function loadLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x) =>
          x &&
          typeof x.id === "string" &&
          typeof x.title === "string" &&
          typeof x.url === "string"
      )
      .map((x) => ({
        id: x.id,
        title: x.title.slice(0, 120),
        url: x.url.slice(0, 2048),
      }));
  } catch {
    return [];
  }
}

function saveLinks(links) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch (e) {
    console.warn("Quick Links: could not save", e);
  }
}

/**
 * @param {{ syncBodyModalOpen?: () => void }} [options]
 */
export function initQuickLinks(options = {}) {
  const syncBodyModalOpen = options.syncBodyModalOpen;
  const widget = document.getElementById("quick-links-widget");
  const grid = document.getElementById("quick-links-grid");
  const editBtn = document.getElementById("quick-links-edit");
  const addFab = document.getElementById("quick-links-add-fab");
  const addModal = document.getElementById("quick-links-add-modal");
  const addClose = document.getElementById("quick-links-add-close");
  const addForm = document.getElementById("quick-links-add-form");
  const urlInput = document.getElementById("quick-links-url-input");
  const titleInput = document.getElementById("quick-links-title-input");
  const addCancel = document.getElementById("quick-links-add-cancel");

  if (!widget || !grid || !editBtn) return;

  let links = loadLinks();
  let editMode = false;
  /** @type {HTMLElement | null} */
  let addModalLastFocus = null;

  function openAddModal() {
    if (!addModal || !urlInput || !titleInput) return;
    addModalLastFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    addModal.classList.add("is-open");
    addModal.setAttribute("aria-hidden", "false");
    syncBodyModalOpen?.();
    urlInput.value = "";
    titleInput.value = "";
    urlInput.focus();
  }

  function closeAddModal() {
    if (!addModal) return;
    addModal.classList.remove("is-open");
    addModal.setAttribute("aria-hidden", "true");
    syncBodyModalOpen?.();
    if (addModalLastFocus?.focus) addModalLastFocus.focus();
    addModalLastFocus = null;
  }

  /**
   * Edit = jiggle + delete badges; links must not navigate (any click / modifier).
   * Done = normal launcher tiles again.
   */
  function syncEditButton() {
    editBtn.setAttribute("aria-pressed", editMode ? "true" : "false");
    editBtn.textContent = editMode ? "Done" : "Edit";
    editBtn.setAttribute(
      "aria-label",
      editMode
        ? "Done editing quick links"
        : "Edit quick links to remove items"
    );
  }

  function setEditMode(on) {
    editMode = on;
    widget.classList.toggle("is-edit-mode", on);
    syncEditButton();
    render();
  }

  function removeLink(id) {
    links = links.filter((l) => l.id !== id);
    saveLinks(links);
    render();
  }

  function addLink(url, title) {
    const href = normalizeUrl(url);
    if (!href) return false;
    const t = (title || "").trim() || new URL(href).hostname;
    links.push({
      id: crypto.randomUUID(),
      title: t.slice(0, 120),
      url: href,
    });
    saveLinks(links);
    render();
    return true;
  }

  function render() {
    grid.innerHTML = "";
    for (const link of links) {
      const tile = document.createElement("div");
      tile.className = "quick-links-tile";
      tile.setAttribute("role", "listitem");
      tile.dataset.linkId = link.id;

      const iconSlot = document.createElement("div");
      iconSlot.className = "quick-links-icon-slot";

      const hitIcon = document.createElement("a");
      hitIcon.className = "quick-links-hit quick-links-hit--icon";
      hitIcon.dataset.linkUrl = link.url;

      const hitCaption = document.createElement("a");
      hitCaption.className = "quick-links-hit quick-links-hit--caption";
      hitCaption.dataset.linkUrl = link.url;

      function applyLinkMode(anchor, isIconPart) {
        if (editMode) {
          anchor.removeAttribute("href");
          anchor.removeAttribute("target");
          anchor.removeAttribute("rel");
          anchor.setAttribute("tabindex", "-1");
          anchor.setAttribute("aria-disabled", "true");
          anchor.setAttribute(
            "aria-label",
            isIconPart
              ? `${link.title}, edit mode — link disabled`
              : `${link.title}, edit mode`
          );
        } else {
          anchor.href = link.url;
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          anchor.removeAttribute("tabindex");
          anchor.removeAttribute("aria-disabled");
          anchor.setAttribute(
            "aria-label",
            `${link.title}, opens in new tab`
          );
        }
      }

      applyLinkMode(hitIcon, true);
      applyLinkMode(hitCaption, false);
      hitCaption.setAttribute("aria-hidden", "true");
      hitCaption.setAttribute("tabindex", "-1");

      const iconWrap = document.createElement("span");
      iconWrap.className = "quick-links-icon-wrap";

      const jiggle = document.createElement("span");
      jiggle.className = "quick-links-icon-jiggle";

      const img = document.createElement("img");
      img.className = "quick-links-favicon";
      img.alt = "";
      img.width = 56;
      img.height = 56;
      img.loading = "lazy";
      img.src = getFaviconUrl(link.url);
      img.addEventListener(
        "error",
        () => {
          img.src = PLACEHOLDER_FAVICON;
        },
        { once: true }
      );

      jiggle.appendChild(img);
      iconWrap.appendChild(jiggle);

      const label = document.createElement("span");
      label.className = "quick-links-label";
      label.textContent = link.title;

      hitIcon.appendChild(iconWrap);
      hitCaption.appendChild(label);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "quick-links-remove";
      removeBtn.setAttribute("aria-label", `Remove ${link.title}`);
      removeBtn.innerHTML = "×";
      removeBtn.hidden = !editMode;

      removeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeLink(link.id);
      });

      iconSlot.appendChild(hitIcon);
      iconSlot.appendChild(removeBtn);

      tile.appendChild(iconSlot);
      tile.appendChild(hitCaption);
      grid.appendChild(tile);
    }
  }

  editBtn.addEventListener("click", () => setEditMode(!editMode));

  addFab?.addEventListener("click", openAddModal);
  addClose?.addEventListener("click", closeAddModal);
  addCancel?.addEventListener("click", closeAddModal);

  addModal?.addEventListener("click", (e) => {
    const panel = e.target?.closest?.(".quick-links-modal-panel");
    if (!panel) closeAddModal();
  });

  addForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const url = urlInput?.value ?? "";
    const title = titleInput?.value ?? "";
    if (!normalizeUrl(url)) {
      urlInput?.focus();
      return;
    }
    addLink(url, title);
    closeAddModal();
  });

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") return;
      if (addModal?.classList.contains("is-open")) {
        closeAddModal();
        e.preventDefault();
        return;
      }
      const settingsOpen = document
        .getElementById("settings-modal")
        ?.classList.contains("is-open");
      if (settingsOpen) return;
      if (editMode) {
        setEditMode(false);
        e.preventDefault();
      }
    },
    true
  );

  syncEditButton();
  render();
}
