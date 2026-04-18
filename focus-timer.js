/**
 * Focus Timer (Pomodoro) — SVG ring, tab title sync, Web Audio chime,
 * typographic minutes editor, wheel adjust, preset pills
 */

const RING_RADIUS = 54;
const RING_C = 2 * Math.PI * RING_RADIUS;
const CLICK_DELAY_MS = 280;
const MIN_MINUTES = 1;
const MAX_MINUTES = 120;

/** Soft 2s synthesized bell (no external files) */
export async function playFocusChime() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    return;
  }

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.03);
  master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2);
  master.connect(ctx.destination);

  const freqs = [523.25, 659.25, 783.99];
  freqs.forEach((hz, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 0.12 : 0.06;
    o.type = "sine";
    o.frequency.setValueAtTime(hz, ctx.currentTime);
    o.connect(g);
    g.connect(master);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 2.05);
  });
  setTimeout(() => {
    try {
      ctx.close();
    } catch {
      /* ignore */
    }
  }, 2200);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatMmSs(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${pad2(m)}:${pad2(s)}`;
}

function clampMinutes(m) {
  if (!Number.isFinite(m)) return MIN_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(m)));
}

function clampTotalSeconds(sec) {
  return Math.min(MAX_MINUTES * 60, Math.max(MIN_MINUTES * 60, Math.round(sec)));
}

export function initFocusTimer() {
  const card = document.querySelector('[data-widget-id="focus-timer"]');
  const widget = card?.querySelector(".focus-timer-widget");
  const control = document.getElementById("focus-timer-control");
  const clockEl = document.getElementById("focus-timer-clock");
  const minsEl = document.getElementById("focus-timer-mins");
  const secsEl = document.getElementById("focus-timer-secs");
  const presetsEl = document.getElementById("focus-timer-presets");
  const progressEl = document.getElementById("focus-timer-progress");
  if (!card || !widget || !control || !clockEl || !minsEl || !secsEl || !progressEl) return;

  const pageTitleBase = document.title.trim() || "Dashboard";

  let intervalId = null;
  /** @type {'idle' | 'running' | 'paused'} */
  let state = "idle";
  let totalSeconds = 25 * 60;
  let remainingSeconds = totalSeconds;
  let clickTimer = null;
  let editingMins = false;
  let wheelAccum = 0;

  function clearTick() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function restoreTitle() {
    document.title = pageTitleBase;
  }

  function syncTitle() {
    if (state !== "running") {
      restoreTitle();
      return;
    }
    document.title = `(${formatMmSs(remainingSeconds)}) ${pageTitleBase}`;
  }

  function updateRing() {
    const t = totalSeconds > 0 ? totalSeconds : 1;
    const frac = remainingSeconds / t;
    progressEl.style.strokeDasharray = String(RING_C);
    progressEl.style.strokeDashoffset = String(RING_C * (1 - frac));
  }

  function updateRunningChrome() {
    widget.classList.toggle("focus-timer-is-running", state === "running");
  }

  function setFlowPulse(on) {
    card.classList.toggle("focus-timer-flow", on);
  }

  function updateControlAria() {
    const timeStr = formatMmSs(remainingSeconds);
    if (state === "running") {
      control.setAttribute(
        "aria-label",
        `Focus timer ${timeStr}, running. Click ring to pause.`
      );
    } else if (state === "paused") {
      control.setAttribute(
        "aria-label",
        `Focus timer ${timeStr}, paused. Click ring to resume. Scroll time to adjust minutes.`
      );
    } else {
      control.setAttribute(
        "aria-label",
        `Focus timer ${timeStr}. Click ring to start. Scroll time to adjust minutes.`
      );
    }
  }

  function syncClockFromRemaining() {
    if (editingMins) return;
    const m = Math.floor(remainingSeconds / 60);
    const s = Math.floor(remainingSeconds % 60);
    minsEl.textContent = pad2(m);
    secsEl.textContent = pad2(s);
  }

  function readMinutesFromClockText() {
    const raw = (minsEl.textContent || "").replace(/\D/g, "");
    if (!raw) return MIN_MINUTES;
    return clampMinutes(parseInt(raw, 10));
  }

  function commitMinutesEdit() {
    editingMins = false;
    if (state === "running") return;
    const m = readMinutesFromClockText();
    const sec = remainingSeconds % 60;
    remainingSeconds = clampTotalSeconds(m * 60 + sec);
    if (state === "idle") {
      totalSeconds = remainingSeconds;
    }
    syncClockFromRemaining();
    updateRing();
    updateControlAria();
  }

  function adjustMinutesByWheel(deltaSteps) {
    if (state === "running") return;
    let m = Math.floor(remainingSeconds / 60);
    const sec = remainingSeconds % 60;
    m = clampMinutes(m + deltaSteps);
    remainingSeconds = clampTotalSeconds(m * 60 + sec);
    if (state === "idle") {
      totalSeconds = remainingSeconds;
    }
    syncClockFromRemaining();
    updateRing();
    updateControlAria();
  }

  function applyPreset(minutes) {
    const m = clampMinutes(minutes);
    const sec = m * 60;
    totalSeconds = sec;
    remainingSeconds = sec;
    state = "idle";
    clearTick();
    setFlowPulse(false);
    restoreTitle();
    syncClockFromRemaining();
    updateRing();
    updateRunningChrome();
    updateControlAria();
  }

  function render() {
    syncClockFromRemaining();
    minsEl.contentEditable = state === "running" ? "false" : "true";
    updateRing();
    syncTitle();
    updateRunningChrome();
    updateControlAria();
  }

  function tick() {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      clearTick();
      state = "idle";
      setFlowPulse(false);
      restoreTitle();
      playFocusChime();
      const refill =
        totalSeconds > 0
          ? totalSeconds
          : clampMinutes(readMinutesFromClockText()) * 60;
      totalSeconds = refill;
      remainingSeconds = refill;
      syncClockFromRemaining();
      updateRing();
      updateRunningChrome();
      updateControlAria();
      return;
    }
    render();
  }

  function startOrResume() {
    if (state === "running") return;
    if (remainingSeconds <= 0) {
      totalSeconds = clampMinutes(readMinutesFromClockText()) * 60;
      remainingSeconds = totalSeconds;
    }
    if (totalSeconds <= 0) {
      totalSeconds = clampMinutes(readMinutesFromClockText()) * 60;
      remainingSeconds = totalSeconds;
    }
    state = "running";
    setFlowPulse(true);
    clearTick();
    intervalId = window.setInterval(tick, 1000);
    render();
  }

  function pause() {
    if (state !== "running") return;
    clearTick();
    state = "paused";
    setFlowPulse(false);
    restoreTitle();
    render();
  }

  function toggle() {
    if (state === "running") pause();
    else startOrResume();
  }

  function reset() {
    clearTick();
    state = "idle";
    setFlowPulse(false);
    const full =
      totalSeconds > 0
        ? totalSeconds
        : clampTotalSeconds(clampMinutes(readMinutesFromClockText()) * 60);
    totalSeconds = full;
    remainingSeconds = full;
    restoreTitle();
    render();
  }

  function onControlClick(e) {
    if (clockEl.contains(e.target)) return;
    clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => {
      toggle();
    }, CLICK_DELAY_MS);
  }

  function onControlDblClick(e) {
    if (clockEl.contains(e.target)) return;
    e.preventDefault();
    clearTimeout(clickTimer);
    reset();
  }

  clockEl.addEventListener("click", (e) => e.stopPropagation());
  clockEl.addEventListener("dblclick", (e) => e.stopPropagation());

  clockEl.addEventListener(
    "wheel",
    (e) => {
      if (state === "running") return;
      e.preventDefault();
      wheelAccum += e.deltaY;
      const threshold = 48;
      if (Math.abs(wheelAccum) < threshold) return;
      const dir = wheelAccum < 0 ? 1 : -1;
      wheelAccum = 0;
      adjustMinutesByWheel(dir);
    },
    { passive: false }
  );

  minsEl.addEventListener("focus", () => {
    editingMins = true;
    const m = Math.floor(remainingSeconds / 60);
    minsEl.textContent = String(m);
  });

  minsEl.addEventListener("blur", () => {
    commitMinutesEdit();
  });

  minsEl.addEventListener("input", () => {
    if (state === "running") return;
    let t = minsEl.textContent.replace(/\D/g, "").slice(0, 3);
    minsEl.textContent = t;
  });

  minsEl.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      minsEl.blur();
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
    }
  });

  presetsEl?.querySelectorAll(".focus-timer-pill").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const raw = btn.getAttribute("data-minutes");
      const m = raw ? parseInt(raw, 10) : 25;
      if (Number.isFinite(m)) applyPreset(m);
    });
  });

  control.addEventListener("click", onControlClick);
  control.addEventListener("dblclick", onControlDblClick);

  control.addEventListener("keydown", (e) => {
    if (document.activeElement === minsEl) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });

  window.addEventListener("beforeunload", () => {
    clearTick();
    restoreTitle();
  });

  progressEl.style.strokeDasharray = String(RING_C);
  progressEl.style.strokeDashoffset = "0";
  minsEl.textContent = "25";
  secsEl.textContent = "00";
  totalSeconds = 25 * 60;
  remainingSeconds = totalSeconds;
  render();
}
