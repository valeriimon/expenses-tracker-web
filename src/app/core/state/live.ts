import { effect, signal, type Signal } from '@angular/core';
import { liveQuery } from 'dexie';

/** A read's result, together with the parameters it was read for. */
export type LiveResult<P, T> = {
  params: P;
  value: T;
};

/**
 * A database read kept current, as a signal.
 *
 * Re-runs when `params` changes and whenever a write touches what the query
 * read — from this page, another page, or another tab. That is what makes
 * create, edit, delete, and import all show up everywhere without any
 * per-mutation invalidation, and it matters here in a way it would not in a
 * plain router: Ionic keeps tab pages alive, so a page cannot rely on being
 * re-created to pick up a change.
 *
 * The result carries the parameters it belongs to. Until a read for the current
 * parameters has resolved, the signal still holds the previous one, and a
 * caller that must not show stale data compares `params` to tell the two apart
 * — which is how an empty state avoids flashing for a week that has expenses.
 *
 * `params` is read inside an effect, so the signals it touches are what the
 * read is keyed on. Must be called in an injection context.
 */
export function live<P, T>(
  params: () => P,
  query: (params: P) => Promise<T>,
): Signal<LiveResult<P, T> | undefined> {
  const state = signal<LiveResult<P, T> | undefined>(undefined);

  effect((onCleanup) => {
    const current = params();

    const subscription = liveQuery(() => query(current)).subscribe({
      next: (value) => state.set({ params: current, value }),
      error: (error) => console.error(error),
    });

    onCleanup(() => subscription.unsubscribe());
  });

  return state.asReadonly();
}
