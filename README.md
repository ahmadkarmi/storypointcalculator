# Story Point Calculator

Agile estimation tool. Rate eight factors and get a Fibonacci story point
estimate, a T-shirt size, and a shareable link you can paste into a ticket.

Live at **[storypointcalculator.com](https://www.storypointcalculator.com/)**.

## Features

- Eight factors on a labelled 1–5 scale — every level carries a word, so
  "Moderate" is a judgement rather than a guess at what "3" meant
- Fibonacci estimate plus T-shirt size and a confidence range
- Plain-language explanation of which factors drove the number
- Contribution breakdown showing each factor's real share of the score
- Shareable permalinks — the estimate lives in the URL, nothing is stored
  server-side
- Optional per-factor weights, which travel in the link
- Works offline, installable as a PWA
- Dark mode, keyboard navigable, screen-reader labelled
- Analytics load only after consent; decline and nothing is requested

## Running locally

```bash
npm install
npm start          # http://localhost:8080
```

No build step. The app is static ES modules — `index.html`, `app.js`,
`scoring.js`, `styles.css`.

## Tests

```bash
npm test           # once
npm run test:ci    # once, CI reporter
npm run test:watch # watch mode
```

`scoring.test.js` covers the estimation model, including an exhaustive sweep of
all 5⁸ input combinations. `app.test.js` covers rendering, interaction,
permalinks, consent gating and the info dialog.

## Layout

| File | Role |
| ---- | ---- |
| `scoring.js` | Estimation model. Pure — no DOM, no globals |
| `app.js` | Rendering, input, sharing, weights, consent |
| `index.html` | Markup, SEO metadata, JSON-LD |
| `styles.css` | Tokenised styles, dark mode, reduced motion |
| `sw.js` | Service worker: network-first navigation, cache-first assets |
| `docs/scoring.md` | How the estimate is calculated, and why |

## Deployment

Static files served from Dreamhost; `.htaccess` handles HTTPS and the
non-www → www redirect. There is no SPA rewrite — a missing file returns an
honest 404.

## License

ISC
