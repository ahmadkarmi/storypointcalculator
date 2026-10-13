/**
 * Story Point Calculator — UI layer.
 *
 * All estimation logic lives in scoring.js; this file only renders it and
 * wires up input, sharing, weights and consent.
 */

import {
  FACTORS,
  FIBONACCI,
  DEFAULT_VALUES,
  DEFAULT_WEIGHTS,
  areValuesValid,
  effortOf,
  scoreFactors,
  contributionShares,
} from './scoring.js';
import {
  GROUPS,
  groupMarkup,
  ribbonMarkup,
  weightMarkup,
  driversMarkup,
  chartMarkup,
} from './markup.js';
/** Weights travel in the URL as single digits: 0.5 -> "2", 2 -> "8". */
const WEIGHT_ENCODE = 4;

const state = {
  values: [...DEFAULT_VALUES],
  weights: [...DEFAULT_WEIGHTS],
};

const el = {};

/* ------------------------------------------------------------------ state */

function weightsAreDefault() {
  return state.weights.every((w, i) => w === DEFAULT_WEIGHTS[i]);
}

/** Serialise state to a URL fragment. Weights are omitted when untouched. */
function encodeState() {
  const v = state.values.join('');
  if (weightsAreDefault()) return `v=${v}`;
  const w = state.weights.map((x) => Math.round(x * WEIGHT_ENCODE)).join('');
  return `v=${v}&w=${w}`;
}

/**
 * Parse a URL fragment back into state. Anything malformed is rejected whole
 * rather than partially applied, so a mangled link falls back to the defaults.
 */
function decodeState(hash) {
  const params = new URLSearchParams((hash || '').replace(/^#/, ''));
  const rawValues = params.get('v');
  if (!rawValues || !/^[1-5]{8}$/.test(rawValues)) return null;

  const values = rawValues.split('').map(Number);
  if (!areValuesValid(values)) return null;

  let weights = [...DEFAULT_WEIGHTS];
  const rawWeights = params.get('w');
  if (rawWeights) {
    if (!/^[2-8]{8}$/.test(rawWeights)) return null;
    weights = rawWeights.split('').map((d) => Number(d) / WEIGHT_ENCODE);
  }
  return { values, weights };
}

function syncHash() {
  // replaceState, not pushState: adjusting a slider should not stack up
  // history entries the back button has to chew through.
  history.replaceState(null, '', `#${encodeState()}`);
}

/* -------------------------------------------------------------- rendering */

/** Restart a one-shot CSS animation on a node whose content just changed. */
function pop(node) {
  node.classList.remove('pop');
  void node.offsetWidth; // force a reflow so re-adding the class replays it
  node.classList.add('pop');
}

function renderFactors() {
  el.factors.innerHTML = GROUPS.map(groupMarkup).join('');
  el.factors.addEventListener('change', (event) => {
    const input = event.target;
    if (input.type !== 'radio') return;
    const index = Number(input.closest('.factor').dataset.index);
    state.values[index] = Number(input.value);
    update();
  });
}

function renderWeights() {
  el.weightRows.innerHTML = FACTORS.map(weightMarkup).join('');
  el.weightRows.addEventListener('input', (event) => {
    const index = event.target.dataset.weightFor;
    if (index === undefined) return;
    state.weights[Number(index)] = Number(event.target.value);
    update();
  });
}

/** Reflect state onto the controls without re-rendering them. */
function syncControls() {
  FACTORS.forEach((factor, i) => {
    const level = state.values[i];
    const row = el.factors.querySelector(`.factor[data-index="${i}"]`);
    const radio = row.querySelector(`input[value="${level}"]`);
    radio.checked = true;
    row.style.setProperty('--level', level);
    row.dataset.heat = effortOf(level, factor);
    row.querySelectorAll('.segment').forEach((segment, s) => {
      segment.classList.toggle('is-below', s + 1 < level);
    });

    const value = row.querySelector('.factor-value');
    const word = factor.scale[level - 1];
    if (value.textContent && value.textContent !== word) pop(value);
    value.textContent = word;
    row.querySelector('.chip-level').textContent = `${level}/5`;

    const weight = el.weightRows.querySelector(`[data-weight-for="${i}"]`);
    if (weight) weight.value = state.weights[i];
    const weightOut = el.weightRows.querySelector(`[data-weight-out="${i}"]`);
    if (weightOut) weightOut.textContent = `${state.weights[i]}×`;
  });
  el.weightsReset.disabled = weightsAreDefault();
  el.weightsSub.textContent = weightsAreDefault() ? 'all factors × 1' : 'custom weights';
}

function renderGroupShares(shares) {
  GROUPS.forEach((group, g) => {
    const share = group.indexes.reduce((sum, i) => sum + shares[i], 0);
    el.factors.querySelector(`[data-share-for="${g}"]`).textContent = `${Math.round(share * 100)}%`;
  });
}

function renderScale(result) {
  const [low, high] = result.range;
  el.ribbon.style.setProperty('--band', FIBONACCI.indexOf(result.points));
  el.ribbon.querySelectorAll('.band').forEach((band) => {
    const points = Number(band.dataset.points);
    band.classList.toggle('is-current', points === result.points);
    band.classList.toggle('in-range', points >= low && points <= high && points !== result.points);
  });
  el.meter.style.setProperty('--norm', result.norm);
  el.norm.textContent = `${result.norm.toFixed(3)} → band ${result.points}`;
}

function renderResult(result) {
  const changed = el.points.textContent !== String(result.points);
  const first = el.points.textContent === '–';
  el.points.textContent = result.points;
  el.size.textContent = result.size;
  el.size.dataset.size = result.size.toLowerCase();
  const range = result.range[0] === result.range[1]
    ? `${result.range[0]} points`
    : `typically ${result.range[0]}–${result.range[1]} points`;
  el.range.textContent = range;

  el.peekPoints.textContent = result.points;
  el.peekSize.textContent = result.size;
  el.peekRange.textContent = range;
  if (changed && !first) [el.points, el.size, el.peekPoints].forEach(pop);

  el.rule.hidden = !result.ruleFired;
  if (result.ruleFired) el.rule.textContent = `Raised to ${result.points}: ${result.ruleFired}.`;

  const shares = contributionShares(state.values, state.weights);
  renderScale(result);
  el.drivers.innerHTML = driversMarkup(result.drivers);
  el.chart.innerHTML = chartMarkup(shares);
  renderGroupShares(shares);
}

let lastPoints = null;

function update() {
  const result = scoreFactors(state.values, state.weights);
  syncControls();
  renderResult(result);
  syncHash();

  // Give the collapsed sheet a visible reaction, so adjusting a factor is
  // legibly connected to the number even when the detail is out of view.
  if (lastPoints !== null && result.points !== lastPoints) {
    const dir = result.points > lastPoints ? 'up' : 'down';
    el.sheet.dataset.bump = dir;
    setTimeout(() => { delete el.sheet.dataset.bump; }, 700);
  }
  lastPoints = result.points;
}

/* ---------------------------------------------------------------- actions */

function summaryText() {
  const result = scoreFactors(state.values, state.weights);
  const drivers = result.drivers.length
    ? ` Driven by ${result.drivers.map((d) => `${d.label} (${d.word})`).join(', ')}.`
    : '';
  return `${result.points} story points (${result.size}).${drivers} `
    + `${location.origin}${location.pathname}#${encodeState()}`;
}

async function copy(text, button) {
  const label = button.querySelector('.btn-label');
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard API needs a secure context; fall back to a selectable prompt
    // rather than silently doing nothing.
    window.prompt('Copy this:', text);
    return;
  }
  label.textContent = 'Copied';
  button.dataset.copied = 'true';
  setTimeout(() => {
    label.textContent = button.dataset.label;
    delete button.dataset.copied;
  }, 1600);
}

function reset() {
  state.values = [...DEFAULT_VALUES];
  state.weights = [...DEFAULT_WEIGHTS];
  update();
}

/* ------------------------------------------------------------------ sheet */

/** The results panel is a sidebar on desktop and a bottom sheet on mobile. */
function sheetIsCollapsible() {
  return window.matchMedia('(max-width: 959px)').matches;
}

function setSheet(open) {
  el.sheet.dataset.open = open ? 'true' : 'false';
  el.sheetToggle.setAttribute('aria-expanded', String(open));
  el.sheetBackdrop.hidden = !open;
  // Only lock the page behind the sheet; on desktop it is a normal sidebar.
  document.body.classList.toggle('sheet-open', open && sheetIsCollapsible());
}

function toggleSheet() {
  setSheet(el.sheet.dataset.open !== 'true');
}

function initSheet() {
  setSheet(false);
  el.sheetToggle.addEventListener('click', toggleSheet);
  el.sheetBackdrop.addEventListener('click', () => setSheet(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.sheet.dataset.open === 'true') setSheet(false);
  });

  // Swipe down on the handle to dismiss, matching the platform gesture.
  let startY = null;
  el.sheetToggle.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  el.sheetToggle.addEventListener('touchend', (e) => {
    if (startY === null) return;
    const dy = e.changedTouches[0].clientY - startY;
    startY = null;
    if (Math.abs(dy) < 24) return;
    e.preventDefault();          // a swipe is not also a tap
    setSheet(dy < 0);
  });

  // Leaving mobile widths must not strand the page in a locked state.
  window.matchMedia('(max-width: 959px)').addEventListener('change', () => {
    setSheet(false);
  });
}

/* ------------------------------------------------------------------ modal */

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
let lastFocused = null;

function openModal() {
  lastFocused = document.activeElement;
  el.modal.hidden = false;
  const first = el.modal.querySelector(FOCUSABLE);
  if (first) first.focus();
  document.addEventListener('keydown', onModalKeydown);
}

function closeModal() {
  el.modal.hidden = true;
  document.removeEventListener('keydown', onModalKeydown);
  if (lastFocused) lastFocused.focus();
}

function onModalKeydown(event) {
  if (event.key === 'Escape') {
    closeModal();
    return;
  }
  if (event.key !== 'Tab') return;
  // Keep focus inside the dialog while it is open.
  const items = [...el.modal.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* ---------------------------------------------------------------- consent */

const GA_ID = 'G-VG9PN1RWWE';

/** Load analytics only once consent exists. Nothing is requested before that. */
function loadAnalytics() {
  if (window.__gaLoaded) return;
  window.__gaLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}

function initConsent() {
  const stored = localStorage.getItem('cookie-consent');
  if (stored === 'accepted') {
    loadAnalytics();
    return;
  }
  if (stored === 'declined') return;

  el.consent.hidden = false;
  // The consent bar and the collapsed sheet both want the bottom edge; lift
  // the sheet clear of it until a choice is made.
  document.body.classList.add('consent-open');
  document.body.style.setProperty('--consent-h', `${el.consent.offsetHeight}px`);
  const dismiss = () => {
    el.consent.hidden = true;
    document.body.classList.remove('consent-open');
    document.body.style.removeProperty('--consent-h');
  };

  el.consentAccept.addEventListener('click', () => {
    localStorage.setItem('cookie-consent', 'accepted');
    dismiss();
    loadAnalytics();
  });
  el.consentDecline.addEventListener('click', () => {
    localStorage.setItem('cookie-consent', 'declined');
    dismiss();
  });
}

/* ------------------------------------------------------------------- init */

let initialised = false;

export function initApp() {
  // The module self-initialises on import; guard so an explicit call (or a
  // second import) cannot bind every listener twice.
  if (initialised) return;

  const byId = (id) => document.getElementById(id);
  Object.assign(el, {
    factors: byId('factors'),
    points: byId('points'),
    size: byId('size'),
    range: byId('range'),
    peekPoints: byId('peek-points'),
    peekSize: byId('peek-size'),
    peekRange: byId('peek-range'),
    ribbon: byId('ribbon'),
    meter: byId('meter'),
    norm: byId('norm'),
    weightsSub: byId('weights-sub'),
    sheet: byId('results'),
    sheetToggle: byId('sheet-toggle'),
    sheetBackdrop: byId('sheet-backdrop'),
    drivers: byId('drivers'),
    rule: byId('rule'),
    chart: byId('chart'),
    weightRows: byId('weight-rows'),
    weightsReset: byId('weights-reset'),
    resetBtn: byId('reset'),
    copyBtn: byId('copy-result'),
    copyLinkBtn: byId('copy-link'),
    modal: byId('info-modal'),
    infoBtn: byId('info-btn'),
    modalClose: byId('close-info-modal'),
    consent: byId('cookie-consent'),
    consentAccept: byId('accept-cookies'),
    consentDecline: byId('decline-cookies'),
  });
  if (!el.factors) return;
  initialised = true;

  const restored = decodeState(location.hash);
  if (restored) {
    state.values = restored.values;
    state.weights = restored.weights;
  }

  renderFactors();
  el.ribbon.innerHTML = ribbonMarkup();
  renderWeights();

  el.resetBtn.addEventListener('click', reset);
  el.weightsReset.addEventListener('click', () => {
    state.weights = [...DEFAULT_WEIGHTS];
    update();
  });
  el.copyBtn.addEventListener('click', () => copy(summaryText(), el.copyBtn));
  el.copyLinkBtn.addEventListener('click', () => copy(
    `${location.origin}${location.pathname}#${encodeState()}`, el.copyLinkBtn,
  ));

  el.infoBtn.addEventListener('click', openModal);
  el.modalClose.addEventListener('click', closeModal);
  el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

  window.addEventListener('hashchange', () => {
    const next = decodeState(location.hash);
    if (!next) return;
    state.values = next.values;
    state.weights = next.weights;
    update();
  });

  initSheet();
  initConsent();
  update();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

export { decodeState, encodeState, state };
