/**
 * Story point scoring model.
 *
 * Pure: no DOM, no globals, no side effects. See docs/scoring.md for the
 * rationale behind the curve, the normalisation and the risk floors.
 */

export const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34];

/** Exponent applied to each factor. >1 makes high-effort factors escalate. */
const CURVE = 1.7;

/** Lowest and highest level any factor can take. */
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

/**
 * The eight estimation factors, in display and URL order.
 *
 * `inverse` factors are scored against `MAX_LEVEL + 1 - value`: a team that is
 * unfamiliar with the work (level 1) is doing *more* work, not less. Their
 * `scale` wording therefore runs worst-to-best, matching the raw level.
 */
export const FACTORS = [
  {
    key: 'logic',
    label: 'Business Logic Complexity',
    description: 'How complex is the decision-making or data handling?',
    inverse: false,
    scale: ['Trivial', 'Simple', 'Moderate', 'Complex', 'Severe'],
  },
  {
    key: 'technical',
    label: 'Technical Difficulty',
    description: 'How hard is this to build or architect?',
    inverse: false,
    scale: ['Trivial', 'Straightforward', 'Moderate', 'Hard', 'Very hard'],
  },
  {
    key: 'volume',
    label: 'Amount of Work',
    description: 'How many components, modules or screens are involved?',
    inverse: false,
    scale: ['Tiny', 'Small', 'Moderate', 'Large', 'Very large'],
  },
  {
    key: 'collaboration',
    label: 'Team Collaboration',
    description: 'How much syncing with other people does this need?',
    inverse: false,
    scale: ['Solo', 'Minimal', 'Some', 'Frequent', 'Constant'],
  },
  {
    key: 'unknowns',
    label: 'Unknowns & Ambiguity',
    description: 'How much is still unclear or risky?',
    inverse: false,
    scale: ['None', 'Few', 'Some', 'Many', 'Severe'],
  },
  {
    key: 'dependencies',
    label: 'External Dependencies',
    description: 'Are we waiting on vendors, APIs or approvals?',
    inverse: false,
    scale: ['None', 'One minor', 'Some', 'Several', 'Blocking'],
  },
  {
    key: 'familiarity',
    label: 'Familiarity with Task',
    description: 'How confident are we in how to do this?',
    inverse: true,
    scale: ['Never done it', 'Rarely', 'Somewhat', 'Comfortable', 'Routine'],
  },
  {
    key: 'clarity',
    label: 'Clarity of Requirements',
    description: 'How well documented and understood is the ask?',
    inverse: true,
    scale: ['Undefined', 'Vague', 'Partial', 'Mostly clear', 'Fully specified'],
  },
];

/** Index lookups, so the risk floors read as names rather than numbers. */
const IDX = FACTORS.reduce((map, f, i) => Object.assign(map, { [f.key]: i }), {});

/** Neutral starting point: every factor mid-scale. */
export const DEFAULT_VALUES = FACTORS.map(() => 3);

/**
 * Per-factor multipliers. 1 means "counts the same as every other factor",
 * which is what the model has always actually applied. Teams can bias a factor
 * up or down without the defaults changing any published estimate.
 */
export const DEFAULT_WEIGHTS = FACTORS.map(() => 1);
export const MIN_WEIGHT = 0.5;
export const MAX_WEIGHT = 2;

/**
 * Risk floors. These encode judgement the smooth curve cannot: a story gated on
 * a maxed-out external dependency is never small, however tidy the rest looks.
 * Evaluated in order; the first match wins.
 */
const RISK_FLOORS = [
  {
    floor: 21,
    reason: 'Unknowns and External Dependencies are both at maximum',
    test: (v) => v[IDX.unknowns] === MAX_LEVEL && v[IDX.dependencies] === MAX_LEVEL,
  },
  {
    floor: 13,
    reason: 'Business Logic or Technical Difficulty is at maximum',
    test: (v) => v[IDX.logic] === MAX_LEVEL || v[IDX.technical] === MAX_LEVEL,
  },
  {
    floor: 8,
    reason: 'Unknowns or External Dependencies are at maximum',
    test: (v) => v[IDX.unknowns] === MAX_LEVEL || v[IDX.dependencies] === MAX_LEVEL,
  },
];

/** Effort a factor contributes, after inverting the two confidence factors. */
export function effortOf(value, factor) {
  return factor.inverse ? MAX_LEVEL + 1 - value : value;
}

function isValidLevel(v) {
  return Number.isInteger(v) && v >= MIN_LEVEL && v <= MAX_LEVEL;
}

/** Every value must be a whole level in range, one per factor. */
export function areValuesValid(values) {
  return Array.isArray(values)
    && values.length === FACTORS.length
    && values.every(isValidLevel);
}

function sanitiseWeights(weights) {
  if (!Array.isArray(weights) || weights.length !== FACTORS.length) {
    return DEFAULT_WEIGHTS.slice();
  }
  return weights.map((w) => {
    const n = Number(w);
    if (!Number.isFinite(n)) return 1;
    return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, n));
  });
}

function bandFor(norm) {
  if (norm <= 0.05) return 1;
  if (norm <= 0.15) return 2;
  if (norm <= 0.30) return 3;
  if (norm <= 0.48) return 5;
  if (norm <= 0.65) return 8;
  if (norm <= 0.80) return 13;
  if (norm <= 0.93) return 21;
  return 34;
}

export function pointsToTShirt(points) {
  if (points <= 2) return 'XS';
  if (points === 3) return 'S';
  if (points === 5) return 'M';
  if (points === 8) return 'L';
  if (points === 13) return 'XL';
  if (points === 21) return 'XXL';
  return 'Epic';
}

/** Neighbouring bands, as an honest confidence range around the estimate. */
export function rangeFor(points) {
  const i = FIBONACCI.indexOf(points);
  if (i === -1) return [points, points];
  return [
    FIBONACCI[Math.max(0, i - 1)],
    FIBONACCI[Math.min(FIBONACCI.length - 1, i + 1)],
  ];
}

/** Weighted, curved effort per factor plus the extremes of that same scale. */
function decompose(values, weights) {
  let sum = 0;
  let minSum = 0;
  let maxSum = 0;
  const parts = FACTORS.map((factor, i) => {
    const part = weights[i] * Math.pow(effortOf(values[i], factor), CURVE);
    sum += part;
    minSum += weights[i] * Math.pow(MIN_LEVEL, CURVE);
    maxSum += weights[i] * Math.pow(MAX_LEVEL, CURVE);
    return part;
  });
  return { parts, sum, minSum, maxSum };
}

/**
 * Score a full set of factor values.
 *
 * @param {number[]} values One integer level (1-5) per factor.
 * @param {number[]} [weights] Optional per-factor multipliers.
 * @returns {{valid: boolean, points: number|null, size: string, norm: number,
 *   range: number[], drivers: object[], ruleFired: string|null}}
 */
export function scoreFactors(values, weights) {
  if (!areValuesValid(values)) {
    return {
      valid: false, points: null, size: '–', norm: 0,
      range: [0, 0], drivers: [], ruleFired: null,
    };
  }

  const w = sanitiseWeights(weights);
  const { parts, sum, minSum, maxSum } = decompose(values, w);

  // Normalise against the true extremes of the *transformed* values. Using raw
  // extremes here is what previously pushed norm outside 0-1 and collapsed the
  // entire lower half of the input range onto a single band.
  const span = maxSum - minSum;
  const norm = span === 0 ? 0 : Math.min(1, Math.max(0, (sum - minSum) / span));

  let points = bandFor(norm);
  let ruleFired = null;
  for (const rule of RISK_FLOORS) {
    if (rule.test(values)) {
      if (points < rule.floor) {
        points = rule.floor;
        ruleFired = rule.reason;
      }
      break;
    }
  }

  // What actually pushed the number up: the factors carrying the largest share
  // of the very sum the estimate came from.
  const drivers = FACTORS
    .map((factor, i) => ({
      key: factor.key,
      label: factor.label,
      word: factor.scale[values[i] - 1],
      effort: effortOf(values[i], factor),
      share: sum === 0 ? 0 : parts[i] / sum,
    }))
    .filter((d) => d.effort > 2)
    .sort((a, b) => b.share - a.share)
    .slice(0, 3);

  return {
    valid: true,
    points,
    size: pointsToTShirt(points),
    norm,
    range: rangeFor(points),
    drivers,
    ruleFired,
  };
}

/** Per-factor share of the total, for the contribution chart. */
export function contributionShares(values, weights) {
  if (!areValuesValid(values)) return FACTORS.map(() => 0);
  const { parts, sum } = decompose(values, sanitiseWeights(weights));
  return sum === 0 ? parts.map(() => 0) : parts.map((p) => p / sum);
}
