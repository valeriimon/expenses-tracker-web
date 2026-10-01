// Polyfills for running unit tests under jsdom (the default Vitest environment).
// Ionic components such as ion-menu and ion-split-pane query `window.matchMedia`,
// which jsdom does not implement.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Pin the timezone so date tests are deterministic and actually exercise the
// UTC-vs-local distinction. Europe/Kyiv is UTC+2, UTC+3 under DST — the zone
// the app is being built for, and one where the local calendar day and the UTC
// calendar day genuinely diverge for part of every night.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env['TZ'] = 'Europe/Kyiv';
