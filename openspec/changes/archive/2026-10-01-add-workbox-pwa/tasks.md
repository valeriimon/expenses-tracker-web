## 1. Remove the Angular service worker

- [x] 1.1 Uninstall `@angular/service-worker`, delete `ngsw-config.json`, remove the `serviceWorker` option from the production configuration in `angular.json`, and remove `provideServiceWorker` and its imports from `src/main.ts`; verify `ng build` succeeds and `www/` contains no `ngsw-worker.js` or `ngsw.json`

## 2. Generate the Workbox service worker

- [x] 2.1 Add `workbox-build` as a dev dependency and `workbox-window` as a dependency, and verify both install without peer-dependency errors
- [x] 2.2 Create `scripts/build-sw.mjs` calling `generateSW` with the configuration in design.md (glob patterns, hashed-file pattern, `navigateFallback`, `skipWaiting: false`, `clientsClaim`, `cleanupOutdatedCaches`, raised size limit), exiting non-zero if Workbox reports any warning; verify running it after `ng build` writes `www/sw.js` and prints the number of precached files
- [x] 2.3 Change the `build` script in `package.json` to run `ng build` and then the script, and verify `npm run build` produces `www/sw.js` whose precache list includes `index.html`, `manifest.webmanifest`, the main bundle, and the lazy chunk for each page

## 3. Register it and offer updates

- [x] 3.1 Create `src/app/core/state/update.service.ts`: registers `sw.js` through `workbox-window` in production builds only, once the app is stable; exposes nothing in development; verify with `ng serve` that no service worker is registered
- [x] 3.2 On the `waiting` event, show a bar in the app shell reading "An update is ready", in the page flow rather than floating, with a Reload button and a Later button; Reload calls `messageSkipWaiting()`; verify by inspection that the buttons are ordinary focusable buttons and that Later leaves the worker waiting
- [x] 3.3 Reload the page when control changes to the new worker rather than on the button press, and call `update()` when the document becomes visible again; verify by reading the code that a window which did not press Reload also reloads
- [x] 3.4 Add the `offline` signal to the service (`saving`, `ready`, `unsupported`) as set out in design.md: `ready` at startup when the page already has a controller, `ready` on `activated` when it is not an update, `unsupported` when service workers are unavailable, registration fails, or the build is a development one; verify with `ng serve` that the signal reads `unsupported`
- [x] 3.5 On that same first-install `activated` event, present a four-second toast reading "Ready to use offline" with no buttons, and verify by reading the code that it cannot fire on an update or when a controller already existed at startup
- [x] 3.6 In the "Where your data lives" section of `settings.page.ts`, add a line reading the signal: "Being saved for offline use…", "Available offline", or "Not available offline in this browser"; verify with `ng serve` that the third wording is shown
- [x] 3.7 Start the service from `AppComponent` and keep the existing `navigator.storage.persist()` request; verify `npm run lint` and `npm test` pass

## 4. Make it installable

- [x] 4.1 Add a source SVG icon to `src/assets/icon/` in the ledger palette, and `scripts/build-icons.mjs` rendering it with Playwright's Chromium to `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and `apple-touch-icon.png`; run it, commit the PNGs, and verify by opening them that the maskable icon's mark sits inside the central 80%
- [x] 4.2 Update `src/manifest.webmanifest` with the three icons (the maskable one marked `"purpose": "maskable"`), keeping `start_url` and `scope` relative and `display: standalone`; verify the built `www/manifest.webmanifest` parses and every icon path in it resolves to a file in `www/`
- [x] 4.3 In `src/index.html` add `theme-color` meta tags for the light and dark appearance, the Apple touch icon link, and replace the deprecated status-bar meta; verify in a production build that Chrome DevTools' Application panel reports the manifest with no installability errors

## 5. Test against the production build

- [x] 5.1 Add `scripts/serve-www.mjs`, a static server for `www/` with `index.html` fallback and `Cache-Control: no-cache` on `sw.js`, and a `preview` script that builds then serves; verify `npm run preview` serves the app and a deep link such as `/settings/categories` loads
- [x] 5.2 Add a `pwa` project to `playwright.config.ts` with its own `webServer` and spec file, leaving the existing project unchanged, and an `e2e:pwa` script; verify `npm run e2e` still runs only the existing suite against `ng serve`
- [x] 5.3 Add a test that loads the app, waits for the service worker to control the page, goes offline, reloads, and then opens Insights, the entry form, settings, and the import without having visited them online; verify it passes
- [x] 5.4 Add a test that, offline, opens a deep link directly and sees that page, and one that records an expense offline and sees it after going back online and reloading; verify both pass
- [x] 5.5 Add a test for the update offer: record an expense, change `www/index.html` and re-run `scripts/build-sw.mjs`, reload, see the "An update is ready" bar, press Reload, and see the page reload with the bar gone and the expense still present; verify it passes
- [x] 5.6 Add a test that a first visit shows the "Ready to use offline" toast and that settings then reads "Available offline", and that reloading shows no ready toast while settings still reads "Available offline"; and extend the update test in 5.5 to assert the ready toast does not appear alongside the update notice; verify they pass
- [x] 5.7 Add a test that no update notice appears on an ordinary load or on an offline load, and one that fetches the manifest and checks its name, `display`, and that each icon responds with an image of the declared size; verify both pass

## 6. Docs and verification

- [x] 6.1 Update `CLAUDE.md`: the build command's two steps, `npm run preview`, `npm run e2e:pwa`, the `UpdateService` and its `offline` signal, and the hosting requirements (HTTPS, `index.html` fallback, no caching of `sw.js`); verify no mention of the Angular service worker remains in `CLAUDE.md`, `openspec/config.yaml`, or code comments
- [x] 6.2 Walk the scenarios in `specs/offline-install/spec.md` that the automated tests cannot reach — installing in Chrome, opening the installed app, the installed app sharing data with the tab, settings changing from "being saved" to "available" while open, two windows updating together, and picking up an unaccepted update after closing every window — and note any that fail or could not be checked
- [x] 6.3 Verify `npm run lint`, `npm test`, `npm run e2e`, and `npm run e2e:pwa` all pass, then run `openspec validate add-workbox-pwa --strict`
