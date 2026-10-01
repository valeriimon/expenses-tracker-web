import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// Page transitions are positional animation, so under reduced motion a page
// simply replaces the one before it.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // One platform style everywhere: the ledger look should not change with
    // the device the browser happens to be running on.
    provideIonicAngular({ mode: 'md', animated: !reduceMotion }),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    // Caches the app itself, so it opens with no network at all. The data
    // never needed one: it lives in IndexedDB.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}).then(() => {
  // Asks the browser not to evict this site's storage under pressure. It may
  // decline; the app works the same either way.
  navigator.storage?.persist?.().catch(() => undefined);
});
