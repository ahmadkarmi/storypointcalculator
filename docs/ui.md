# UI system

How the interface looks and moves. Implemented in `styles.css`,
`components.css` and `results.css`; templates in `markup.js`.

## Palette

Three tones carry the whole page.

| Role | Light | Dark |
| ---- | ----- | ---- |
| Ground (with a 22px dot grid) | `#F5F4F0` | `#11100D` |
| Ink and the estimate panel | `#16150F` | `#EDEAE2` text, `#1F1D18` panel |
| Accent (action, current band) | `#FF5A1F` | same |

The estimate panel stays graphite in both themes. On phones the bottom sheet
re-points the surface tokens at the panel palette, so the cards inside it
need no separate styling.

## Heat ramp

Each factor carries `data-heat` (1 to 5), set by `app.js` from
`effortOf()` in `scoring.js`. It is the effort the level adds, not the raw
level, so the two confidence factors run the other way: "Never done it" is
hot, "Routine" is calm.

| Heat | Fill | Text on fill |
| ---- | ---- | ------------ |
| 1 sand | `#DAD5CB` | ink |
| 2 peach | `#F7CBA4` | ink |
| 3 apricot | `#FF9A5C` | ink |
| 4 tangerine | `#FF5A1F` | ink |
| 5 ember | `#B83208` | white |

Each step is darker than the last, so levels differ in lightness and not only
hue. Every fill and tint pairing meets WCAG AA for its text.

## Data accents

- Each group header carries one dot per factor, coloured by that factor's
  heat, so a group's temperature reads at a glance.
- The group share badge has a small pie that fills with the group's share of
  total effort (animated through the registered `--share` property).
- The hero carries a faint golden spiral traced through its Fibonacci
  squares, the same scale the estimate snaps to. Hidden below 640px.

## Type

Geist for text, Geist Mono for numbers, labels and anything that reads as
data. Both are self-hosted (latin subset) so nothing is requested from a
third party before consent and the page renders offline.

## Motion

- The selected level is one thumb that slides between segments.
- The ribbon marker and raw score meter glide to the new band.
- Changed values (points, size, level word) replay a short blur-in via the
  `.pop` class; `pop()` in `app.js` restarts it.
- The collapsed sheet ripples when the estimate changes.
- The hero spiral draws itself once on load; its centre dot breathes.

`prefers-reduced-motion` collapses every animation and transition.

## Layout

| Width | Factors | Estimate |
| ----- | ------- | -------- |
| < 640px | Stacked rows in one card per group | Floating bar, opens a bottom sheet |
| 640 to 959px | Two cards per row | Floating bar, opens a bottom sheet |
| ≥ 960px | One row per factor, control on the right | Sticky sidebar |
