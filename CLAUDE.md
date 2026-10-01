# expenses-tracker-web

A weekly expense ledger as a web app: Angular + Ionic, data in IndexedDB, no backend. Ported from the React Native app in `../expenses-tracker`; behaviour is specified in `openspec/specs/`.

## Commands

- `npm start` — dev server
- `npm test` — unit tests (Vitest, one run)
- `npm run e2e` — Playwright end-to-end tests (starts the dev server on port 4300 itself)
- `npm run lint`
- `npm run build` — production build into `www/`, with the service worker
- `openspec validate --specs --strict`

## Layout

- `src/app/core/lib/` — pure logic (dates, currency, CSV, import planning, insights arithmetic). No Angular, no storage. Every rule here has a unit test.
- `src/app/core/db/` — Dexie database and the only code that writes to it. IndexedDB has no constraints, so each write restates its validation; multi-step writes run in one `db.transaction`.
- `src/app/core/state/` — `WeekStore` (week start, and the one viewed week that Expenses and Insights share) and `live()`, which turns a query into a signal that re-runs on any relevant write.
- `src/app/features/<destination>/` — pages. `src/app/ui/` — shared presentational components.
- `src/theme/variables.scss` — colour roles, mapped onto Ionic's variables. `src/theme/ledger.scss` — type roles, spacing, shared shapes.
- `e2e/` — Playwright specs.

## Conventions

- Money is integer minor units; format only through `core/lib/currency.ts`. Entry amounts use `formatMinorBare`, sums use `formatMinor`.
- Dates are calendar days as `YYYY-MM-DD` strings; all date arithmetic goes through `core/lib/dates.ts`.
- Colour comes only from the `--ledger-*` roles. The accent is for interactive elements, never for an amount.
- Amounts carry the `.amount` class. One `app-balance-rule` per page, under the outermost total.
- Pages read data through `live()` rather than loading once: Ionic keeps tab pages alive, so a page is not re-created when data changes elsewhere.
- Signals and zoneless change detection: state that the template reads must be a signal.
- Ionic components are imported from `@ionic/angular`; the app runs in `md` mode on every platform.
- Unit tests are `*.spec.ts` beside the code and run under a pinned `Europe/Kyiv` timezone.
