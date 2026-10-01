# expenses-tracker-web

A weekly expense ledger as a web app: Angular + Ionic, data in IndexedDB, no backend. Ported from the React Native app in `../expenses-tracker`; behaviour is specified in `openspec/specs/`.

## Commands

- `npm start` — dev server
- `npm test` — unit tests (Vitest, one run)
- `npm run e2e` — Playwright end-to-end tests against the dev server (starts it on port 4300 itself)
- `npm run e2e:pwa` — Playwright tests against the production build: offline, install, updates. Builds first.
- `npm run lint`
- `npm run build` — `ng build` into `www/`, then `scripts/build-sw.mjs` generates the Workbox service worker (`www/sw.js`) from that output
- `npm run preview` — builds and serves `www/` on port 4301
- `npm run cert` — issues an HTTPS certificate for `localhost` and this machine's LAN addresses into `certs/` (needs `mkcert`; not committed). Re-run if the machine's address changes.
- `npm run preview:lan` — builds and serves `www/` over HTTPS with that certificate, for using the full app (offline, install) from a phone on the same network. The phone must trust mkcert's root certificate.
- `node scripts/build-icons.mjs` — re-renders the app icons from `src/assets/icon/icon.svg`; run by hand and commit the PNGs
- `openspec validate --specs --strict`

## Layout

- `src/app/core/lib/` — pure logic (dates, currency, CSV, import planning, insights arithmetic). No Angular, no storage. Every rule here has a unit test.
- `src/app/core/db/` — Dexie database and the only code that writes to it. IndexedDB has no constraints, so each write restates its validation; multi-step writes run in one `db.transaction`.
- `src/app/core/state/` — `WeekStore` (week start, and the one viewed week that Expenses and Insights share), `live()`, which turns a query into a signal that re-runs on any relevant write, and `UpdateService`, which registers the service worker in production builds and exposes `offline` (saving / ready / unsupported) and `updateReady`.
- `src/app/features/<destination>/` — pages. `src/app/ui/` — shared presentational components.
- `src/theme/variables.scss` — colour roles, mapped onto Ionic's variables. `src/theme/ledger.scss` — type roles, spacing, shared shapes.
- `e2e/` — Playwright specs: `app.spec.ts` for the dev server, `pwa.spec.ts` for the production build.
- `scripts/` — service worker generation, a static server for `www/`, icon rendering.

## Conventions

- Money is integer minor units; format only through `core/lib/currency.ts`. Entry amounts use `formatMinorBare`, sums use `formatMinor`.
- Dates are calendar days as `YYYY-MM-DD` strings; all date arithmetic goes through `core/lib/dates.ts`.
- Colour comes only from the `--ledger-*` roles. The accent is for interactive elements, never for an amount.
- Amounts carry the `.amount` class. One `app-balance-rule` per page, under the outermost total.
- Pages read data through `live()` rather than loading once: Ionic keeps tab pages alive, so a page is not re-created when data changes elsewhere.
- Signals and zoneless change detection: state that the template reads must be a signal.
- Ionic components are imported from `@ionic/angular`; the app runs in `md` mode on every platform.
- Unit tests are `*.spec.ts` beside the code and run under a pinned `Europe/Kyiv` timezone.

## Offline and hosting

The service worker precaches every file in the build, so the whole app works offline after one visit. A new version waits until the user accepts the reload offer; nothing registers a service worker in development.

Any static host works, provided it:

- serves over HTTPS (browsers refuse service workers otherwise; `localhost` is exempt);
- answers unknown paths with `index.html`;
- does not cache `sw.js`, or a new deploy is not noticed.

`scripts/serve-www.mjs` does the last two and is what the production tests run against.
