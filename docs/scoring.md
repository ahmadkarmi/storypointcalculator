# Scoring model

Source of truth for how an estimate is produced. Implemented in
[`scoring.js`](../scoring.js), locked by [`scoring.test.js`](../scoring.test.js).

## Inputs

Eight factors, each an integer level 1–5.

| # | Factor | Inverse |
| - | ------ | ------- |
| 0 | Business Logic Complexity | no |
| 1 | Technical Difficulty | no |
| 2 | Amount of Work | no |
| 3 | Team Collaboration | no |
| 4 | Unknowns & Ambiguity | no |
| 5 | External Dependencies | no |
| 6 | Familiarity with Task | **yes** |
| 7 | Clarity of Requirements | **yes** |

The two inverse factors are converted to effort with `6 - level` before anything
else happens. A team that has never done the work (level 1) is doing *more*
work, not less. Their displayed wording therefore runs worst-to-best, so the
level the user picks always reads naturally.

## The curve

```
effort_i = inverse_i ? 6 - value_i : value_i
sum      = Σ weight_i · effort_i ^ 1.7
minSum   = Σ weight_i · 1 ^ 1.7
maxSum   = Σ weight_i · 5 ^ 1.7
norm     = (sum - minSum) / (maxSum - minSum)      clamped to [0, 1]
```

The exponent makes effort escalate rather than accumulate linearly: a story that
is moderately hard along several dimensions outscores one that is severe in a
single dimension and trivial elsewhere. That matches how work behaves —
compounding uncertainty is worse than one known-hard problem.

`norm` maps onto Fibonacci bands:

| norm ≤ | 0.05 | 0.15 | 0.30 | 0.48 | 0.65 | 0.80 | 0.93 | else |
| ------ | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| points | 1 | 2 | 3 | 5 | 8 | 13 | 21 | 34 |

### Why minSum and maxSum are computed this way

`sum` accumulates values that have **already** been inverted, so the true
extremes are "every effort is 1" and "every effort is 5".

Before v2 the constants were built from *raw* levels instead
(`1^1.7·6 + 5^1.7·2` and `5^1.7·6 + 1^1.7·2`). That made `norm` range from
**−0.50 to +1.50** rather than 0 to 1, with two consequences:

- Everything from the documented minimum up to roughly "all 2s" produced a
  negative `norm` and clamped into the first band. Genuinely different stories —
  a one-line copy change and a small task nobody on the team had done before —
  both returned **1 point**.
- Three hardcoded overrides existed to paper over it, including one asserting
  "all sliders at 3 → 5 points" because the formula itself returned 3.

With the constants corrected, those three overrides reproduce naturally and have
been removed. `scoring.test.js` asserts `norm ∈ [0,1]` exhaustively across all
5⁸ = 390,625 input combinations, and that the estimate is monotonic in every
factor.

## Risk floors

Applied after the curve, in order; the first match wins, and a floor only ever
*raises* an estimate.

| Condition | Floor |
| --------- | ----- |
| Unknowns **and** External Dependencies both at 5 | 21 |
| Business Logic **or** Technical Difficulty at 5 | 13 |
| Unknowns **or** External Dependencies at 5 | 8 |

These encode judgement the curve cannot: a story gated on a maxed-out external
dependency is never genuinely small, however tidy the rest looks. Without them,
only 0.2% of combinations reach 21 and 0.002% reach 34.

## Weights

`weight_i` defaults to **1** for every factor — equal weighting, which is what
the model has always actually applied. Teams can bias a factor between 0.5× and
2×; the weight is applied inside the same sum, and `minSum`/`maxSum` use the
same weights, so `norm` stays in range for any weighting.

Earlier versions declared per-factor weights of 0.13/0.11 that the formula never
read; they only fed a chart. Measured across the full input space, that spread
changed the resulting band in 4.21% of combinations with a maximum `norm` shift
of 0.03 — noise. Equal defaults lose nothing and make the tunable-weights
feature honest. A test asserts default weights are a no-op.

## Outputs

- `points` — Fibonacci band
- `size` — T-shirt size (1–2 XS, 3 S, 5 M, 8 L, 13 XL, 21 XXL, 34 Epic)
- `range` — the neighbouring bands, as a confidence range
- `drivers` — up to three factors with effort > 2, by share of `sum`
- `ruleFired` — which risk floor applied, if any
