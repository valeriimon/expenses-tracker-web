## Why

The app keeps all of its data in the browser, so it has no reason to need a network after the first visit — but today that rests on Angular's own service worker, wired by hand, with a placeholder 64px icon, no way to install the app properly, and no say for the user in when a new version takes over. This change makes "works offline, installs like an app" a specified capability, and builds it on Workbox.

## What Changes

- The service worker is generated with Workbox instead of `@angular/service-worker`. Every file of the built app is precached, so every destination and every page opens with no network after the first visit — including pages that have never been opened.
- **BREAKING** (build): `@angular/service-worker`, `ngsw-config.json`, and the `serviceWorker` build option are removed. `npm run build` gains a step that generates the Workbox service worker after the Angular build.
- The app says when it is ready for offline use. Saving the app for offline takes a moment after the first visit, and until it finishes the offline guarantee does not hold — so the user is told once, when it does, and can check the current state in settings at any time.
- The app becomes installable: a complete web app manifest with real icons (192px, 512px, and a maskable 512px), an Apple touch icon, and theme colours for the light and dark appearance. Installed, it opens in its own window on the Expenses destination and reads the same data as the browser tab.
- When a new version has been deployed, it is downloaded in the background and the user is offered a reload. The new version does not take over until they accept, so nothing changes under someone part-way through an entry. Declining leaves the running version working.
- Updating the app never touches recorded expenses, categories, or settings.
- An end-to-end test runs against the production build to prove offline opening, offline navigation to an unvisited page, and the update offer.

Out of scope: push notifications, background sync, and any server — there is nothing to sync to. Caching of third-party resources is also out of scope, because the app loads none.

## Capabilities

### New Capabilities

- `offline-install`: what the app guarantees with no network after a first visit, how the user learns that guarantee now holds, what makes it installable and how the installed app behaves, and how a new version reaches someone who already has an older one.

### Modified Capabilities

None. `app-shell` already requires that the shell opens and remains usable offline once loaded; this change adds a capability that specifies how far that reaches and adds installation and updates, without changing what `app-shell` states.

## Impact

- `package.json` — removes `@angular/service-worker`; adds `workbox-build` (dev) and `workbox-window`; `build` script runs the service worker generation after `ng build`.
- `angular.json`, `ngsw-config.json`, `src/main.ts` — Angular service worker configuration and registration removed.
- New: a build script that generates the service worker into `www/`, a small update service that registers it, reports when the app is ready offline, and raises the reload offer, and a static server script for running the production build locally.
- `src/manifest.webmanifest`, `src/index.html`, `src/assets/icon/` — full manifest, theme-colour and Apple meta tags, new icon files.
- `src/app/features/settings/settings.page.ts` — a line stating whether the app is available offline.
- `playwright.config.ts`, `e2e/` — a second Playwright project that builds and serves the production output.
- `CLAUDE.md` — build and test commands.
- Deployment: the app must be served over HTTPS (browsers refuse service workers otherwise, `localhost` excepted), with unknown paths falling back to `index.html`, and with the service worker file itself not cached by the host.
