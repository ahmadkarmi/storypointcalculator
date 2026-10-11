/**
 * @jest-environment jsdom
 *
 * UI-level tests. The estimation model itself is covered in scoring.test.js;
 * these only assert that the DOM reflects it and that input flows through.
 */

import { FACTORS, DEFAULT_VALUES } from './scoring';

/** Minimal shell mirroring the ids app.js binds to in index.html. */
const SHELL = `
  <div id="factors"></div>
  <span id="points"></span><span id="size"></span><span id="range"></span>
  <div id="results">
    <button id="sheet-toggle" aria-expanded="false"></button>
    <span id="peek-points"></span><span id="peek-size"></span>
    <div id="sheet-body"></div>
  </div>
  <div id="sheet-backdrop" hidden></div>
  <ul id="drivers"></ul><p id="rule" hidden></p><ul id="chart"></ul>
  <div id="weight-rows"></div><button id="weights-reset"></button>
  <button id="reset"></button>
  <button id="copy-result" data-label="Copy result"></button>
  <button id="copy-link" data-label="Copy link"></button>
  <div id="info-modal" hidden><button id="close-info-modal"></button><a href="#x">link</a></div>
  <button id="info-btn"></button>
  <div id="cookie-consent" hidden>
    <button id="accept-cookies"></button><button id="decline-cookies"></button>
  </div>`;

let app;

async function mount(hash = '') {
  window.location.hash = hash;
  document.body.innerHTML = SHELL;
  jest.resetModules();
  // Importing self-initialises against the shell above; no explicit call.
  app = await import('./app');
}

const setLevel = (factorIndex, level) => {
  const factor = FACTORS[factorIndex];
  const radio = document.querySelector(
    `input[name="factor-${factor.key}"][value="${level}"]`,
  );
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
};

const shown = () => ({
  points: document.getElementById('points').textContent,
  size: document.getElementById('size').textContent,
});

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  // mount() only replaces document.body, so clear the head and the load guard
  // that a previous test's consent may have left behind.
  delete window.__gaLoaded;
  document.querySelectorAll('script[src*="googletagmanager"]').forEach((s) => s.remove());
});

describe('rendering', () => {
  test('renders one labelled group per factor', async () => {
    await mount();
    expect(document.querySelectorAll('.factor')).toHaveLength(FACTORS.length);
    FACTORS.forEach((f) => {
      expect(document.querySelectorAll(`input[name="factor-${f.key}"]`)).toHaveLength(5);
    });
  });

  test('every radio carries its word in the accessible name', async () => {
    await mount();
    const first = FACTORS[0];
    const radios = [...document.querySelectorAll(`input[name="factor-${first.key}"]`)];
    radios.forEach((radio, i) => {
      expect(radio.getAttribute('aria-label')).toBe(`${i + 1}, ${first.scale[i]}`);
    });
  });

  test('every group points at its description for screen readers', async () => {
    await mount();
    FACTORS.forEach((f) => {
      const radio = document.querySelector(`input[name="factor-${f.key}"]`);
      expect(radio.getAttribute('aria-describedby')).toBe(`desc-${f.key}`);
      expect(document.getElementById(`desc-${f.key}`)).not.toBeNull();
    });
  });

  test('opens on the neutral default rather than an empty-looking state', async () => {
    await mount();
    expect(shown()).toEqual({ points: '5', size: 'M' });
    FACTORS.forEach((f, i) => {
      const checked = document.querySelector(`input[name="factor-${f.key}"]:checked`);
      expect(Number(checked.value)).toBe(DEFAULT_VALUES[i]);
    });
  });

  test('mirrors the estimate into the collapsed sheet peek', async () => {
    await mount();
    expect(document.getElementById('peek-points').textContent).toBe('5');
    expect(document.getElementById('peek-size').textContent).toBe('M');
  });

  test('renders a contribution row per factor', async () => {
    await mount();
    expect(document.querySelectorAll('#chart .contrib')).toHaveLength(FACTORS.length);
  });
});

describe('interaction', () => {
  test('changing a level updates the estimate', async () => {
    await mount();
    const before = shown().points;
    FACTORS.forEach((f, i) => setLevel(i, f.inverse ? 1 : 5));
    expect(shown().points).not.toBe(before);
    expect(shown()).toEqual({ points: '34', size: 'Epic' });
  });

  test('the selected word is shown next to the factor label', async () => {
    await mount();
    setLevel(0, 5);
    const value = document.querySelector('[data-value-for="0"]');
    expect(value.textContent).toBe(FACTORS[0].scale[4]);
  });

  test('reset returns to the neutral default', async () => {
    await mount();
    setLevel(0, 5);
    setLevel(2, 5);
    expect(shown().points).not.toBe('5');
    document.getElementById('reset').click();
    expect(shown()).toEqual({ points: '5', size: 'M' });
  });

  test('a fired risk floor is surfaced, and hidden otherwise', async () => {
    await mount();
    const rule = document.getElementById('rule');
    expect(rule.hidden).toBe(true);
    setLevel(4, 5); // Unknowns
    setLevel(5, 5); // External Dependencies
    expect(rule.hidden).toBe(false);
    expect(rule.textContent).toMatch(/both at maximum/);
  });
});

describe('shareable state', () => {
  test('the estimate is written to the URL hash', async () => {
    await mount();
    expect(window.location.hash).toBe('#v=33333333');
    setLevel(0, 5);
    expect(window.location.hash).toBe('#v=53333333');
  });

  test('a shared link restores the exact estimate', async () => {
    await mount('#v=54321155');
    FACTORS.forEach((f, i) => {
      const checked = document.querySelector(`input[name="factor-${f.key}"]:checked`);
      expect(checked.value).toBe('54321155'[i]);
    });
  });

  test.each([
    ['out of range digits', '#v=99999999'],
    ['too short', '#v=333'],
    ['not digits', '#v=abcdefgh'],
    ['unrelated fragment', '#hello'],
    ['empty', ''],
  ])('%s falls back to the defaults instead of throwing', async (_label, hash) => {
    await mount(hash);
    expect(shown()).toEqual({ points: '5', size: 'M' });
  });

  test('weights are omitted from the link while untouched', async () => {
    await mount();
    expect(window.location.hash).not.toContain('w=');
  });

  test('adjusted weights travel in the link and restore', async () => {
    await mount();
    const slider = document.querySelector('[data-weight-for="0"]');
    slider.value = '2';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(window.location.hash).toContain('w=');

    const shared = window.location.hash;
    await mount(shared);
    expect(document.querySelector('[data-weight-for="0"]').value).toBe('2');
  });

  test('malformed weights reject the whole fragment', async () => {
    await mount('#v=33333333&w=zzzzzzzz');
    expect(shown()).toEqual({ points: '5', size: 'M' });
    expect(document.querySelector('[data-weight-for="0"]').value).toBe('1');
  });
});

describe('consent gating', () => {
  test('no analytics script is present before a choice is made', async () => {
    await mount();
    expect(document.getElementById('cookie-consent').hidden).toBe(false);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  test('accepting loads analytics and remembers the choice', async () => {
    await mount();
    document.getElementById('accept-cookies').click();
    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
    expect(document.querySelector('script[src*="googletagmanager"]')).not.toBeNull();
  });

  test('the consent bar lifts the sheet clear of it, and releases on choice', async () => {
    await mount();
    expect(document.body.classList.contains('consent-open')).toBe(true);
    document.getElementById('decline-cookies').click();
    expect(document.body.classList.contains('consent-open')).toBe(false);
    expect(document.body.style.getPropertyValue('--consent-h')).toBe('');
  });

  test('declining loads nothing, now or on a later visit', async () => {
    await mount();
    document.getElementById('decline-cookies').click();
    expect(localStorage.getItem('cookie-consent')).toBe('declined');
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();

    await mount();
    expect(document.getElementById('cookie-consent').hidden).toBe(true);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });
});

describe('info dialog', () => {
  test('opens, closes on Escape, and restores focus to the trigger', async () => {
    await mount();
    const trigger = document.getElementById('info-btn');
    const modal = document.getElementById('info-modal');

    trigger.focus();
    trigger.click();
    expect(modal.hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modal.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  test('closes on the close button', async () => {
    await mount();
    document.getElementById('info-btn').click();
    document.getElementById('close-info-modal').click();
    expect(document.getElementById('info-modal').hidden).toBe(true);
  });
});

describe('results sheet', () => {
  const sheet = () => document.getElementById('results');
  const toggle = () => document.getElementById('sheet-toggle');

  test('starts collapsed', async () => {
    await mount();
    expect(sheet().dataset.open).toBe('false');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('sheet-backdrop').hidden).toBe(true);
  });

  test('the peek toggles it open and shut', async () => {
    await mount();
    toggle().click();
    expect(sheet().dataset.open).toBe('true');
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('sheet-backdrop').hidden).toBe(false);

    toggle().click();
    expect(sheet().dataset.open).toBe('false');
  });

  test('the backdrop dismisses it', async () => {
    await mount();
    toggle().click();
    document.getElementById('sheet-backdrop').click();
    expect(sheet().dataset.open).toBe('false');
  });

  test('Escape dismisses it', async () => {
    await mount();
    toggle().click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(sheet().dataset.open).toBe('false');
  });

  test('the peek keeps updating while collapsed', async () => {
    await mount();
    expect(document.getElementById('peek-points').textContent).toBe('5');
    setLevel(4, 5);
    setLevel(5, 5);
    expect(document.getElementById('peek-points').textContent).toBe('21');
    expect(sheet().dataset.open).toBe('false');
  });

  test('a changed estimate bumps the peek so the tap reads as connected', async () => {
    await mount();
    expect(sheet().dataset.bump).toBeUndefined();
    setLevel(0, 5);
    expect(sheet().dataset.bump).toBe('up');
  });

  test('an unchanged estimate does not bump', async () => {
    await mount();
    setLevel(0, 3); // already 3
    expect(sheet().dataset.bump).toBeUndefined();
  });
});
