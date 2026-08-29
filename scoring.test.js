import {
  FACTORS,
  FIBONACCI,
  DEFAULT_VALUES,
  DEFAULT_WEIGHTS,
  scoreFactors,
  pointsToTShirt,
  rangeFor,
  areValuesValid,
  contributionShares,
} from './scoring';

/** Order: logic, technical, volume, collaboration, unknowns, deps, familiarity*, clarity* */
const points = (values, weights) => scoreFactors(values, weights).points;

describe('scoreFactors — the curve', () => {
  test('the documented minimum scores 1', () => {
    expect(points([1, 1, 1, 1, 1, 1, 5, 5])).toBe(1);
  });

  test('the documented maximum scores 34', () => {
    expect(points([5, 5, 5, 5, 5, 5, 1, 1])).toBe(34);
  });

  test('a neutral story scores 5 without needing a rule override', () => {
    const result = scoreFactors(DEFAULT_VALUES);
    expect(result.points).toBe(5);
    expect(result.size).toBe('M');
    expect(result.ruleFired).toBeNull();
  });

  test('normalised score stays within 0..1 across the whole input space', () => {
    // Exhaustive over every combination of levels for all eight factors.
    const levels = [1, 2, 3, 4, 5];
    let checked = 0;
    const walk = (acc) => {
      if (acc.length === FACTORS.length) {
        const { norm } = scoreFactors(acc);
        expect(norm).toBeGreaterThanOrEqual(0);
        expect(norm).toBeLessThanOrEqual(1);
        checked += 1;
        return;
      }
      for (const l of levels) walk([...acc, l]);
    };
    walk([]);
    expect(checked).toBe(levels.length ** FACTORS.length);
  });

  test('effort is monotonic: raising any single factor never lowers the estimate', () => {
    const base = [...DEFAULT_VALUES];
    FACTORS.forEach((factor, i) => {
      for (let level = 1; level < 5; level += 1) {
        const lower = [...base];
        const higher = [...base];
        lower[i] = level;
        higher[i] = level + 1;
        // Inverse factors run the other way: a higher raw level means less effort.
        const a = points(factor.inverse ? higher : lower);
        const b = points(factor.inverse ? lower : higher);
        expect(b).toBeGreaterThanOrEqual(a);
      }
    });
  });

  test('the lower half of the range no longer collapses onto one band', () => {
    // These are genuinely different stories and must not all score the same.
    const distinct = new Set([
      points([1, 1, 1, 1, 1, 1, 5, 5]),
      points([2, 2, 2, 2, 2, 2, 4, 4]),
      points([3, 3, 3, 3, 3, 3, 3, 3]),
      points([4, 4, 4, 4, 4, 4, 2, 2]),
    ]);
    expect(distinct.size).toBe(4);
  });

  test('inverse factors increase the estimate as confidence drops', () => {
    const confident = [3, 3, 3, 3, 3, 3, 5, 5];
    const lost = [3, 3, 3, 3, 3, 3, 1, 1];
    expect(points(lost)).toBeGreaterThan(points(confident));
  });

  test('every result lands on a Fibonacci band', () => {
    for (let i = 0; i < 200; i += 1) {
      const values = FACTORS.map(() => 1 + (i * 7 + FACTORS.length) % 5);
      expect(FIBONACCI).toContain(points(values));
    }
  });
});

describe('scoreFactors — risk floors', () => {
  test('unknowns and dependencies both maxed floors the estimate at 21', () => {
    const result = scoreFactors([1, 1, 1, 1, 5, 5, 5, 5]);
    expect(result.points).toBeGreaterThanOrEqual(21);
    expect(result.ruleFired).toMatch(/both at maximum/);
  });

  test('maxed business logic floors the estimate at 13', () => {
    const result = scoreFactors([5, 1, 1, 1, 1, 1, 5, 5]);
    expect(result.points).toBeGreaterThanOrEqual(13);
  });

  test('either unknowns or dependencies maxed floors the estimate at 8', () => {
    expect(points([1, 1, 1, 1, 5, 1, 5, 5])).toBeGreaterThanOrEqual(8);
    expect(points([1, 1, 1, 1, 1, 5, 5, 5])).toBeGreaterThanOrEqual(8);
  });

  test('a floor never lowers an already-higher estimate', () => {
    // Everything maxed trips the 21 floor, but the curve alone already says 34.
    expect(points([5, 5, 5, 5, 5, 5, 1, 1])).toBe(34);
  });

  test('no floor fires for an ordinary story', () => {
    expect(scoreFactors(DEFAULT_VALUES).ruleFired).toBeNull();
  });
});

describe('scoreFactors — invalid input', () => {
  test.each([
    ['empty array', []],
    ['too short', [1, 2, 3]],
    ['too long', [1, 1, 1, 1, 1, 1, 1, 1, 1]],
    ['out of range high', [9, 9, 9, 9, 9, 9, 9, 9]],
    ['out of range low', [0, 0, 0, 0, 0, 0, 0, 0]],
    ['non-integer', [1.5, 2, 3, 3, 3, 3, 3, 3]],
    ['not an array', null],
    ['undefined', undefined],
  ])('%s returns an invalid result instead of throwing', (_label, input) => {
    const result = scoreFactors(input);
    expect(result.valid).toBe(false);
    expect(result.points).toBeNull();
    expect(result.drivers).toEqual([]);
  });

  test('areValuesValid agrees with scoreFactors', () => {
    expect(areValuesValid(DEFAULT_VALUES)).toBe(true);
    expect(areValuesValid([1, 2])).toBe(false);
  });
});

describe('scoreFactors — weights', () => {
  test('default weights are a no-op across the whole input space', () => {
    const levels = [1, 3, 5];
    const walk = (acc) => {
      if (acc.length === FACTORS.length) {
        expect(points(acc, DEFAULT_WEIGHTS)).toBe(points(acc));
        return;
      }
      for (const l of levels) walk([...acc, l]);
    };
    walk([]);
  });

  test('weighting a factor up raises its influence', () => {
    const values = [5, 1, 1, 1, 1, 1, 5, 5];
    const boosted = [...DEFAULT_WEIGHTS];
    boosted[0] = 2;
    // Compare shares rather than bands, since the 13 floor masks the band here.
    const before = contributionShares(values)[0];
    const after = contributionShares(values, boosted)[0];
    expect(after).toBeGreaterThan(before);
  });

  test('malformed weights fall back to the defaults', () => {
    const values = [3, 4, 2, 3, 3, 2, 3, 3];
    expect(points(values, null)).toBe(points(values));
    expect(points(values, [1, 2])).toBe(points(values));
    expect(points(values, FACTORS.map(() => NaN))).toBe(points(values));
  });

  test('weights are clamped to the supported range', () => {
    const values = [4, 4, 3, 3, 3, 3, 2, 2];
    const absurd = FACTORS.map(() => 1000);
    const clamped = FACTORS.map(() => 2);
    expect(points(values, absurd)).toBe(points(values, clamped));
  });
});

describe('drivers and contributions', () => {
  test('names the factors actually pushing the estimate up', () => {
    const { drivers } = scoreFactors([3, 2, 2, 2, 5, 1, 2, 2]);
    expect(drivers[0].label).toBe('Unknowns & Ambiguity');
    expect(drivers[0].word).toBe('Severe');
  });

  test('reports the raw level wording for inverse factors', () => {
    const { drivers } = scoreFactors([1, 1, 1, 1, 1, 1, 1, 1]);
    const familiarity = drivers.find((d) => d.key === 'familiarity');
    expect(familiarity.word).toBe('Never done it');
  });

  test('ignores factors that are not contributing effort', () => {
    const { drivers } = scoreFactors([5, 1, 1, 1, 1, 1, 5, 5]);
    expect(drivers.map((d) => d.key)).toEqual(['logic']);
  });

  test('contribution shares sum to 1', () => {
    const shares = contributionShares([4, 3, 2, 1, 5, 2, 3, 4]);
    expect(shares).toHaveLength(FACTORS.length);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  test('invalid input yields zeroed shares rather than throwing', () => {
    expect(contributionShares([])).toEqual(FACTORS.map(() => 0));
  });
});

describe('presentation helpers', () => {
  test.each([
    [1, 'XS'], [2, 'XS'], [3, 'S'], [5, 'M'],
    [8, 'L'], [13, 'XL'], [21, 'XXL'], [34, 'Epic'],
  ])('%i points is size %s', (pts, size) => {
    expect(pointsToTShirt(pts)).toBe(size);
  });

  test('range brackets the estimate with its neighbouring bands', () => {
    expect(rangeFor(5)).toEqual([3, 8]);
    expect(rangeFor(1)).toEqual([1, 2]);
    expect(rangeFor(34)).toEqual([21, 34]);
  });
});

describe('factor definitions', () => {
  test('every factor has a five-step word scale', () => {
    FACTORS.forEach((f) => {
      expect(f.scale).toHaveLength(5);
      f.scale.forEach((w) => expect(typeof w).toBe('string'));
    });
  });

  test('factor keys are unique', () => {
    expect(new Set(FACTORS.map((f) => f.key)).size).toBe(FACTORS.length);
  });

  test('exactly the two confidence factors are inverse', () => {
    expect(FACTORS.filter((f) => f.inverse).map((f) => f.key))
      .toEqual(['familiarity', 'clarity']);
  });
});
