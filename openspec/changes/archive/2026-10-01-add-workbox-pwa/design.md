## Context

See proposal.md — Why. What shapes the approach is the state of the code this lands in:

- The app is built by Angular's `application` builder (esbuild). Production output goes to `www/` with every script and stylesheet content-hashed (`outputHashing: all`); routes are lazy, so `www/` holds around forty chunks.
- Offline already works through `@angular/service-worker`: `ngsw-config.json`, `serviceWorker` in `angular.json`, and `provideServiceWorker` in `src/main.ts`. It was added by hand because `ng add @angular/pwa` resolved to an incompatible version. It has never been deployed anywhere, so no browser in the wild is controlled by it.
- Icons are inlined by `addIcons`, and the app loads no fonts, images, or data from any other origin. Everything the app needs at runtime is a file in `www/`.
- `src/manifest.webmanifest` exists with one 64px icon, which is below what browsers require to offer installation.
- All data is in IndexedDB through Dexie. A service worker never touches it.
- End-to-end tests run against `ng serve`, where no service worker is registered.

## Goals / Non-Goals

**Goals:**

- One build command that produces a deployable `www/` with its service worker in it.
- A service worker whose whole behaviour is "serve the precached build, fall back to `index.html` for navigations" — no runtime caching rules to reason about.
- The update offer and the offline guarantee both covered by an automated test against the real production build.

**Non-Goals:**

- A custom install button. The browser's own install affordance is what the spec requires; `beforeinstallprompt` is Chromium-only and adds UI the app does not need.
- Runtime caching strategies, background sync, push. There is nothing remote to cache or sync.
- A service worker in development. It would serve stale builds and fight the dev server's reload.

## Decisions

### Workbox `generateSW`, run from a script after `ng build`

A script, `scripts/build-sw.mjs`, calls `workbox-build`'s `generateSW` against `www/` and writes `www/sw.js`. `npm run build` becomes `ng build && node scripts/build-sw.mjs`.

`generateSW` rather than `injectManifest` because the service worker needs no code of its own: precache everything, route navigations to `index.html`, clean up old caches, and activate when told. `generateSW` produces exactly that, bundles the Workbox runtime it needs, and includes the `SKIP_WAITING` message listener when `skipWaiting` is false. `injectManifest` would mean writing a service worker source file and bundling it separately, which the Angular builder does not do — a second bundler configuration to maintain for a file with four statements in it.

A post-build script rather than a builder plugin because Angular's `application` builder exposes no plugin hook for it, and the Workbox CLI offers nothing the Node API does not while adding a config file. The script is a dozen lines and its input is the finished `www/`, so it cannot be affected by how Angular gets there.

Configuration:

- `globPatterns`: every `js`, `css`, `html`, `png`, `svg`, `ico`, `webmanifest` file in `www/`. This is what makes never-visited pages available offline: lazy chunks are precached, not cached on first use.
- `dontCacheBustURLsMatching`: the hashed-filename pattern, so hashed files are precached by URL alone and only `index.html`, the manifest, and icons carry a revision.
- `navigateFallback: 'index.html'`, which is what makes opening `/settings/categories` offline work.
- `skipWaiting: false`, `clientsClaim: true`, `cleanupOutdatedCaches: true`.
- `maximumFileSizeToCacheInBytes` raised above the main bundle's size, since a file silently left out of the precache is a page that fails only offline. The script fails the build if `generateSW` reports any warning for the same reason.

### `workbox-window` for registration and the update offer

A root-provided `UpdateService` registers `sw.js` through `workbox-window` once the page has loaded, in production builds only. It listens for `waiting` — a new worker installed and held back — and raises the offer; on acceptance it calls `messageSkipWaiting()`, and when control of the page changes hands it reloads the page.

`workbox-window` rather than the raw `navigator.serviceWorker` API because telling "a new version is waiting" apart from "the first install just finished" needs careful handling of `updatefound`, `statechange`, and whether a controller already existed; that is exactly the logic the library exists to get right, and it is 2 kB.

Reloading on the change of controller rather than on click is what satisfies the multi-window scenario: `skipWaiting` activates the new worker for every window, each window's `UpdateService` sees `controllerchange`, and each reloads. The listener is the browser's own `controllerchange` rather than `workbox-window`'s `controlling` event, and is attached only when the page already had a controller at startup — the first install also changes the controller, and must not reload. A window that reloaded on click alone would leave the others running old code against a new worker's cache.

The service also calls `update()` when the page becomes visible again after being hidden, so an installed app left open for days still learns of a new version.

### Offline readiness is a signal, announced once and shown in settings

`UpdateService` exposes an `offline` signal with three values: `saving`, `ready`, and `unsupported`.

- It starts as `ready` when the page is already controlled by a service worker at startup (`navigator.serviceWorker.controller` is set) — a later visit, where precaching finished long ago.
- Otherwise it starts as `saving`, and becomes `ready` on `workbox-window`'s `activated` event when `event.isUpdate` is false. With `generateSW`, activation follows installation, and installation resolves only when every precache entry has been fetched and stored — so `activated` on a first install is precisely "everything is cached", with no progress to estimate.
- It is `unsupported` when `'serviceWorker' in navigator` is false, when registration rejects, or in a development build, where no worker is registered.

A page that is uncontrolled but whose registration already has an active worker — the state a hard reload leaves — is also set to `ready`, silently, since nothing will activate to say so.

The same `activated`-and-not-an-update event presents the ready notice: an Ionic toast, "Ready to use offline", four seconds, no buttons. `isUpdate` is what keeps the notice from firing when a new version activates, and the controller check is what keeps it from firing on every later visit; no flag in storage is needed to remember that it was shown.

A transient toast for the announcement rather than a persistent badge because the state it reports is permanent once reached: a badge saying "available offline" on every screen forever is chrome that says nothing after the first minute. A line in settings for the durable answer, because a four-second toast is easy to miss and the user needs somewhere to look. It goes in the existing "Where your data lives" section, which is already where the app explains what is kept in this browser.

No progress bar while saving. Workbox reports no per-file progress from `generateSW`, the whole build is under a megabyte, and the spec asks only that the user knows when it is done.

`unsupported` rather than leaving `saving` on screen because some contexts never finish — Firefox private windows refuse service workers, as does any non-HTTPS origin. "Being saved" that never ends is a false promise.

### The offer is a bar in the page flow, not a toast

A slim bar at the top of the app shell, above the router outlet, reading "An update is ready" with two buttons, Reload and Later. It is rendered by `AppComponent` from an `updateReady` signal on `UpdateService`, and it takes space rather than floating: the outlet is given the height that remains.

The first implementation was an Ionic toast with no timeout, anchored above the tab bar. The production tests showed it sitting on top of the add-expense button and taking presses meant for it. The spec says the offer must not obstruct, and anything that floats and stays will eventually float over something — so the persistent notice moved into the layout, where it cannot cover anything by construction. It carries `role="status"` and its buttons are ordinary buttons in the tab order, which covers the spec's accessibility clause.

Later hides the bar for the rest of the session and does nothing else; the waiting worker stays waiting.

The ready notice stays a toast, because it is gone in four seconds, but its container takes no pointer events, so a press on whatever it is sitting over goes through.

### Icons are generated once from an SVG and committed

A source SVG in the ledger's own vocabulary — the accent ground with a ruled total mark — lives in `src/assets/icon/`. A one-off script renders it to `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (the mark inside the central 80% safe zone), and `apple-touch-icon.png` (180px), using Playwright's Chromium, which is already a dev dependency. The PNGs are committed.

Committed output rather than a build step because icons change roughly never, and a build that needs a browser binary to produce four static files is a build that fails on a fresh CI machine for no good reason. The script stays in the repo so the icons can be regenerated when the mark changes.

`index.html` gains two `theme-color` meta tags keyed on `prefers-color-scheme`, matching the page background in each appearance, and the Apple touch icon link. The manifest's `theme_color` and `background_color` stay the light background, since the manifest allows only one.

### `start_url` and `scope` stay relative

`./` for both, as now, so the app can be deployed under a sub-path by changing only `base href`. The service worker is written to the root of `www/` and so controls the same scope.

### The Angular service worker is removed outright, with no migration

`@angular/service-worker`, `ngsw-config.json`, the `serviceWorker` build option, and `provideServiceWorker` all go. No unregistering shim for `ngsw-worker.js` is written: it was never deployed, so there is no installed worker to retire. A developer who ran a production build locally clears site data for `localhost` once.

### A second Playwright project runs against the production build

`scripts/serve-www.mjs` is a minimal static server for `www/` with `index.html` fallback and `Cache-Control: no-cache` on `sw.js` — the two things a real host must also do. `npm run preview` builds and serves it.

`playwright.config.ts` gains a `pwa` project with its own `webServer` (build, then serve on another port) and its own spec file; the existing project is unchanged and still runs against `ng serve`, so the everyday suite stays fast.

The update test publishes a "new version" without a second Angular build: it appends a comment to `www/index.html`, re-runs `scripts/build-sw.mjs`, and reloads. That changes the precache manifest, which is all a new version is from the service worker's point of view.

## Risks / Trade-offs

- **The whole app is downloaded on first visit, including pages the user may never open.** → That is the requirement, not a side effect, and the whole build is under a megabyte before compression. Precaching happens after the page is interactive.
- **"Ready" means the precache finished, not that the browser will keep it.** A browser under storage pressure can evict the cache later, after which the settings line would still have said "available". → The app already asks for persistent storage, which is the mitigation available; and a later visit with no controller would correctly show `saving` again and re-announce when done.
- **A broken service worker is sticky: a bad `sw.js` can keep serving a bad build.** → The worker is generated, not hand-written; `cleanupOutdatedCaches` and revisioned `index.html` mean any later deploy replaces it; and the host must not cache `sw.js`, which the local server models and the deployment note in `CLAUDE.md` states.
- **Users who never accept the offer and never close the app stay on an old version.** → Accepted. The spec chooses not imposing over always being current, and there is no server whose API an old client could fall out of step with. The only thing an old version can disagree with is the IndexedDB schema — see the next point.
- **A future version that changes the Dexie schema would have an old tab and a new tab open on one database.** → Dexie already handles this: the old tab receives `versionchange` and closes its connection. Not in scope here, but it is the reason a later schema change should arrive together with a prompt to reload, which this change provides.
- **iOS Safari ignores the manifest's icons and has no install prompt.** → The Apple touch icon and meta tags cover Add to Home Screen. Installation on iOS is reached through the share sheet, which the spec's wording ("a browser which offers to install") deliberately allows for.
- **The update test rewrites files in `www/`.** → It runs only in the `pwa` project, which builds `www/` fresh before it starts, and it runs serially.
- **Service workers need HTTPS.** → `localhost` is exempt, which covers development and tests. Deployment requirements are recorded in `CLAUDE.md`; choosing a host is not part of this change.

## Open Questions

- Where the app will be hosted. It does not change anything built here — any static host with HTTPS and an `index.html` fallback works — but a host that sets its own cache headers on `sw.js` will need that overridden.
