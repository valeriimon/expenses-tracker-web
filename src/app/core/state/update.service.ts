import { Injectable, inject, isDevMode, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Workbox } from 'workbox-window';

/**
 * Whether the app itself — not its data, which never needed a network — has
 * been saved in this browser for use offline.
 *
 * - `saving`: a first visit, with the build still being fetched and stored.
 * - `ready`: every file is stored; the app opens with no network.
 * - `unsupported`: this browser or browsing mode will not keep it. Saying so
 *   matters, because "being saved" that never ends is a false promise.
 */
export type OfflineState = 'saving' | 'ready' | 'unsupported';

/** The id the tab bar carries, so a notice can sit above it rather than on it. */
export const TAB_BAR_ID = 'app-tab-bar';

/**
 * Registers the service worker and speaks for it: says once when the app is
 * ready to use offline, and offers a reload when a newer version has arrived.
 *
 * A newer version is offered, never imposed. It is downloaded in the
 * background and then waits; the running version keeps working until the user
 * accepts, so an update cannot discard an entry someone is part-way through.
 *
 * Nothing is registered in a development build: a service worker there would
 * serve stale builds and fight the dev server's reload.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly toasts = inject(ToastController);

  private readonly offlineState = signal<OfflineState>(
    isDevMode() || !('serviceWorker' in navigator) ? 'unsupported' : 'saving',
  );

  /** Whether the app is available offline in this browser. */
  readonly offline = this.offlineState.asReadonly();

  private readonly updateOffered = signal(false);

  /**
   * True while a newer version is waiting and the user has not yet answered.
   * The app shell shows the offer; it is not a toast, because it stays until
   * answered and a toast that stays sits on top of whatever is beneath it.
   */
  readonly updateReady = this.updateOffered.asReadonly();

  private workbox: Workbox | null = null;
  private started = false;
  private declined = false;

  /** Call once, when the app starts. */
  start(): void {
    if (this.started || this.offlineState() === 'unsupported') {
      return;
    }
    this.started = true;

    // A page that already has a controller is a later visit: the build was
    // stored long ago. That is also what tells an update from a first install.
    const hadController = navigator.serviceWorker.controller !== null;
    if (hadController) {
      this.offlineState.set('ready');
    }

    const workbox = new Workbox('sw.js');
    this.workbox = workbox;

    // A first install activating means every file in the precache has been
    // fetched and stored — installation does not resolve until they have. So
    // this is exactly "ready for offline use", with nothing to estimate.
    workbox.addEventListener('activated', (event) => {
      if (event.isUpdate || hadController) {
        return;
      }
      this.offlineState.set('ready');
      this.announceReady();
    });

    // A newer version has been stored and is being held back.
    workbox.addEventListener('waiting', () => {
      // Declining hides the offer for the rest of the session; the new version
      // simply stays waiting and is in use the next time the app is opened.
      if (!this.declined) {
        this.updateOffered.set(true);
      }
    });

    // The reload happens when the new version takes control, not when the
    // button is pressed. Taking control happens in every open window at once,
    // so every window reloads — including the ones where nobody pressed
    // anything — rather than some being left running old code.
    if (hadController) {
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) {
          reloading = true;
          window.location.reload();
        }
      });
    }

    // An installed app can stay open for days; looking again whenever it comes
    // back into view is how it learns of a new version without being closed.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        workbox.update().catch(() => undefined);
      }
    });

    workbox
      .register()
      .then((registration) => {
        // A hard reload leaves a page uncontrolled even though the build is
        // stored. Nothing will activate, so nothing would ever say so.
        if (
          registration?.active &&
          registration.installing === null &&
          registration.waiting === null
        ) {
          this.offlineState.set('ready');
        }
      })
      .catch(() => this.offlineState.set('unsupported'));
  }

  /** Accepts the offer. The page reloads once the new version has taken over. */
  applyUpdate(): void {
    this.updateOffered.set(false);
    this.workbox?.messageSkipWaiting();
  }

  /** Turns the offer down. The running version carries on untouched. */
  declineUpdate(): void {
    this.declined = true;
    this.updateOffered.set(false);
  }

  private async announceReady(): Promise<void> {
    const toast = await this.toasts.create({
      message: 'Ready to use offline',
      duration: 4000,
      // Lets a press through to whatever it happens to be sitting over.
      cssClass: 'passive',
      ...this.placement(),
    });
    await toast.present();
  }

  /** Above the tab bar where there is one on screen, at the bottom otherwise. */
  private placement(): { position: 'bottom'; positionAnchor?: string } {
    const tabBar = document.getElementById(TAB_BAR_ID);
    return tabBar !== null && tabBar.offsetParent !== null
      ? { position: 'bottom', positionAnchor: TAB_BAR_ID }
      : { position: 'bottom' };
  }
}
