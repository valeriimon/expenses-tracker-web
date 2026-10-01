// Generates the service worker for a finished production build.
//
// Run after `ng build`: its input is `www/` as Angular left it, and its output
// is `www/sw.js`. The worker's whole behaviour is "serve the precached build,
// and answer any navigation with index.html" — the app loads nothing from
// anywhere else, so there are no runtime caching rules to reason about.
import { generateSW } from 'workbox-build';

const { count, size, warnings } = await generateSW({
  globDirectory: 'www',
  swDest: 'www/sw.js',

  // Everything the app is made of. Lazy chunks are precached rather than
  // cached on first use, which is what makes a page the user has never opened
  // available offline.
  globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],

  // Angular names scripts and stylesheets by content hash, so their URL alone
  // identifies their content. Only index.html, the manifest and the icons need
  // a revision.
  dontCacheBustURLsMatching: /-[A-Za-z0-9_-]{8}\.(?:js|css)$/,

  // Opening /settings/categories offline has to produce the app, which then
  // routes to that page.
  navigateFallback: 'index.html',

  // A new version waits until the user accepts it; see UpdateService. Once it
  // is told to take over, it takes every open window at once.
  skipWaiting: false,
  clientsClaim: true,
  cleanupOutdatedCaches: true,

  // Above the size of the main bundle. A file left out of the precache is a
  // page that fails only offline.
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

  sourcemap: false,
});

// A warning here means a file was skipped. That is a build failure, not a
// footnote: nothing else would notice until someone was offline.
if (warnings.length > 0) {
  console.error(`Service worker not generated cleanly:\n${warnings.join('\n')}`);
  process.exit(1);
}

console.log(`Service worker written: ${count} files precached, ${(size / 1024).toFixed(0)} kB.`);
