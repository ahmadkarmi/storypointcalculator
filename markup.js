/**
 * HTML templates for the UI. Pure: data in, markup out. app.js owns the DOM.
 */

import { FACTORS, FIBONACCI, MIN_WEIGHT, MAX_WEIGHT, pointsToTShirt } from './scoring.js';

const WEIGHT_STEP = 0.25;

/** Presentation grouping. Confidence factors are inverse, so higher is calmer. */
export const GROUPS = [
  { title: 'The work', hint: '↑ more effort', keys: ['logic', 'technical', 'volume', 'collaboration'] },
  { title: 'The risk', hint: '↑ more uncertainty', keys: ['unknowns', 'dependencies'] },
  { title: 'Your confidence', hint: '↑ less effort', keys: ['familiarity', 'clarity'] },
].map((g) => ({ ...g, indexes: g.keys.map((k) => FACTORS.findIndex((f) => f.key === k)) }));

function factorMarkup(index) {
  const factor = FACTORS[index];
  const descId = `desc-${factor.key}`;
  const segments = factor.scale.map((word, i) => {
    const level = i + 1;
    return `
      <label class="segment">
        <input type="radio" name="factor-${factor.key}" value="${level}"
               aria-label="${level}, ${word}" aria-describedby="${descId}">
        <span aria-hidden="true">${level}</span>
      </label>`;
  }).join('');

  // role="group" rather than fieldset/legend: a legend cannot be laid out
  // freely, and the live value would otherwise churn the group's accessible
  // name on every change. Each radio already announces its own word.
  return `
    <div class="factor" role="group" aria-labelledby="label-${factor.key}" data-index="${index}">
      <div class="factor-text">
        <span class="factor-label" id="label-${factor.key}">${factor.label}</span>
        <p class="factor-desc" id="${descId}">${factor.description}</p>
      </div>
      <div class="factor-control">
        <div class="segments"><span class="thumb" aria-hidden="true"></span>${segments}</div>
        <span class="chip" aria-hidden="true">
          <span class="chip-dot"></span>
          <output class="factor-value" data-value-for="${index}"></output>
          <span class="chip-level"></span>
        </span>
      </div>
    </div>`;
}

export function groupMarkup(group, g) {
  return `
    <section class="group" aria-labelledby="group-${g}" style="--i: ${g}">
      <div class="group-head">
        <h2 id="group-${g}"><span class="group-num">0${g + 1}</span>${group.title}</h2>
        <span class="group-heat" aria-hidden="true">${group.indexes.map((i) => `<i data-heat-for="${i}"></i>`).join('')}</span>
        <span class="group-hint">${group.hint}</span>
        <span class="group-rule" aria-hidden="true"></span>
        <span class="group-share" data-share-for="${g}" title="Share of total effort"></span>
      </div>
      <div class="group-card">${group.indexes.map(factorMarkup).join('')}</div>
    </section>`;
}

export function ribbonMarkup() {
  return FIBONACCI.map((points) => `
    <li class="band" data-points="${points}">
      <span class="band-points">${points}</span>
      <span class="band-size">${pointsToTShirt(points)}</span>
    </li>`).join('');
}

export function weightMarkup(factor, index) {
  return `
    <div class="weight-row">
      <label for="weight-${factor.key}">${factor.label}</label>
      <input type="range" id="weight-${factor.key}" data-weight-for="${index}"
             min="${MIN_WEIGHT}" max="${MAX_WEIGHT}" step="${WEIGHT_STEP}">
      <output data-weight-out="${index}"></output>
    </div>`;
}

export function driversMarkup(drivers) {
  if (!drivers.length) {
    return '<li class="driver driver--none">Nothing stands out. Every factor sits at '
      + 'or below moderate, so this one should be quick.</li>';
  }
  return drivers.map((d) => {
    const pct = Math.round(d.share * 100);
    return `
      <li class="driver">
        <span class="driver-row">
          <span class="driver-label">${d.label} <span class="driver-word">· ${d.word}</span></span>
          <span class="driver-pct">${pct}%</span>
        </span>
        <span class="bar-track" aria-hidden="true"><span class="bar" style="width:${pct}%"></span></span>
      </li>`;
  }).join('');
}

export function chartMarkup(shares) {
  const peak = Math.max(...shares, 0.0001);
  return FACTORS.map((factor, i) => {
    const pct = Math.round(shares[i] * 1000) / 10;
    return `
      <li class="contrib">
        <span class="contrib-label">${factor.label}</span>
        <span class="contrib-track" aria-hidden="true">
          <span class="contrib-bar" style="width:${(shares[i] / peak) * 100}%"></span>
        </span>
        <span class="contrib-pct">${pct}%</span>
      </li>`;
  }).join('');
}
