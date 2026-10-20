# Pickleball hussel

[![Tests](https://github.com/lfb0801/pickleball-hussel-systeem/actions/workflows/tests.yml/badge.svg)](https://github.com/lfb0801/pickleball-hussel-systeem/actions/workflows/tests.yml)

A court scheduler for pickleball club evenings. Each round it decides who plays with and against whom on which court, grouped by level, and rotates rest turns fairly. It keeps no scores or rankings.

The app is available in Dutch (default) and English; the language can be switched at any time from the header, on the laptop and on each phone separately.

**Live:** <https://lfb0801.github.io/pickleball-hussel-systeem/>

## How it works

One laptop or tablet in the hall runs the evening. Players join with their phone by scanning a QR code, sign in with their name and level, see their court, and can pause or leave on their own.

```mermaid
flowchart LR
  P1[Phone] <-- WebRTC --> L[Laptop in the hall]
  P2[Phone] <-- WebRTC --> L
  L -. discovery .- S[Public PeerJS server]
```

- **No server, no database.** The app is a set of static files on GitHub Pages. Phones connect directly to the laptop via [PeerJS](https://peerjs.com/); only finding each other goes through the free public PeerJS server.
- **The laptop is the single source of truth.** Phones send requests; the laptop applies them and sends the new state back.
- **Phones are a convenience, not a requirement.** Everything a phone can do, the laptop can do too, even without internet.
- **No build step.** Plain `<script>` tags instead of ES modules, so everything also works from `file://` and the same code can be tested under Node.

## Project structure

```
├── index.html                 The laptop app (organiser)
├── player.html                The phone app (via the QR code)
├── speler.html                Redirect for old links to the phone app
├── assets/
│   ├── css/                   theme.css (club branding), style.css, player.css
│   ├── js/
│   │   ├── core/              Logic without screens: pairing algorithm, presets, session rules,
│   │   │   │                  storage + migration, network, i18n
│   │   │   └── locales/       nl.js (default) and en.js: every visible text
│   │   ├── laptop/            App start-up and the laptop screens
│   │   └── phone/             The phone app
│   └── vendor/                PeerJS 1.5.4 and qrcode-generator 1.4.4, pinned
├── tests/
│   ├── tests.js               Pairing, session and storage tests
│   ├── migrate-tests.js       Tests for upgrading data saved by older versions
│   ├── index.html             Test runner in the browser
│   └── node.js                The same tests under Node
└── scripts/
    └── stamp-version.js       Appends a ?v= version to every local script and stylesheet
```

`assets/js/core/pairing.js` (the algorithm) and `assets/js/core/session.js` (applying requests from phones) are pure functions without DOM or network access. That makes every schedule reproducible from its input and testable without a browser.

## Languages

All visible text lives in `assets/js/core/locales/`. Static text in the HTML refers to it with `data-t="key"` (and `data-t-placeholder`, `data-t-title`, `data-t-aria-label`); text with values filled in is a function. To add a language, add a locale file with the same keys, load it in both HTML pages and add its code to `I18n.LANGUAGES` in `assets/js/core/i18n.js`. Keys missing from a locale fall back to Dutch.

## Running locally

Nothing to install. Open `index.html` directly in a browser, or start a local server:

```bash
npm start
```

and go to <http://127.0.0.1:8080/>. Phones on the same network need a server that listens on the network address.

## Tests

```bash
npm test
```

Run a subset by filtering on the test name: `node tests/node.js session`. The same tests run in the browser at `tests/index.html`.

## Releasing

The app runs on GitHub Pages from the `master` branch. Pages lets browsers cache files for ten minutes, so before every commit you push, stamp a new version on all local files so a browser never mixes old and new scripts:

```bash
npm run stamp
```
