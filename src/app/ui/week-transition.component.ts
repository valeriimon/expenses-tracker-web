import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { AnimationController, GestureController, type Animation } from '@ionic/angular';

import type { IsoDate } from '../core/lib/dates';

/** How far the incoming week starts from its resting place, in px. */
const TRAVEL = 40;
const DURATION = 220;

/**
 * How far the pointer must travel horizontally before the swipe takes the
 * gesture. Below this, and for any drag that sets off more vertically than
 * horizontally, the page scrolls as it always does: scrolling the log is the
 * far more common intent, so an ambiguous drag resolves to a scroll rather than
 * throwing the user into another week.
 */
const CLAIM_HORIZONTAL = 20;

/**
 * What counts as a deliberate swipe on release: far enough, or fast enough.
 * Distance alone would make a quick flick feel broken, and velocity alone would
 * make a slow deliberate drag do nothing. Velocity is in px per millisecond.
 */
const COMMIT_DISTANCE = 60;
const COMMIT_VELOCITY = 0.45;

/**
 * Carries the week's content on and off as the user moves between weeks.
 *
 * The app's only animation, and it earns its place by saying something the
 * static page cannot: which direction the user just travelled. An earlier week
 * enters from the left, a later one from the right — the page turn of a book
 * kept in date order.
 *
 * Only the week's own content moves. The header stays put, so the controls the
 * user is repeatedly pressing do not slide out from under them.
 *
 * The swipe is an addition to those controls, never a replacement: a gesture is
 * invisible, undiscoverable on its own, and unavailable to a keyboard or a
 * screen reader.
 *
 * Dates are `YYYY-MM-DD`, so a string comparison gives the direction.
 */
@Component({
  selector: 'app-week-transition',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  styles: `
    :host {
      display: block;
      /* Lets the browser keep vertical scrolling while a horizontal drag is
         being judged. */
      touch-action: pan-y;
    }
  `,
})
export class WeekTransitionComponent {
  /** Changing this is what triggers the transition. */
  readonly weekStart = input.required<IsoDate>();

  /** Swiped away from the reading direction. */
  readonly swipePrevious = output<void>();
  /** Swiped toward the reading direction. */
  readonly swipeNext = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly animations = inject(AnimationController);
  private readonly gestures = inject(GestureController);
  private readonly destroyRef = inject(DestroyRef);

  private previousWeek: IsoDate | null = null;
  private running: Animation | null = null;

  constructor() {
    effect(() => this.play(this.weekStart()));

    afterNextRender(() => {
      const gesture = this.gestures.create({
        el: this.host,
        gestureName: 'week-swipe',
        direction: 'x',
        threshold: CLAIM_HORIZONTAL,
        onEnd: (detail) => {
          const far = Math.abs(detail.deltaX) >= COMMIT_DISTANCE;
          const fast = Math.abs(detail.velocityX) >= COMMIT_VELOCITY;

          // Neither far enough nor fast enough to be meant: the week stands.
          if (!far && !fast) {
            return;
          }

          // Content follows the pointer. Dragging left pulls the next week in
          // from the right, which is the direction the transition already
          // animates it from.
          if (detail.deltaX < 0) {
            this.swipeNext.emit();
          } else {
            this.swipePrevious.emit();
          }
        },
      });

      gesture.enable();
      this.destroyRef.onDestroy(() => gesture.destroy());
    });

    this.destroyRef.onDestroy(() => this.running?.destroy());
  }

  private play(weekStart: IsoDate): void {
    const from = this.previousWeek;
    this.previousWeek = weekStart;

    if (from === null || from === weekStart) {
      return;
    }

    // Leaving one mid-flight would strand the content off-centre and
    // part-faded; destroying it puts the element back at rest.
    this.running?.destroy();
    this.running = null;

    // Under reduced motion the new week is simply there: fully visible and in
    // place, without travelling. The outcome is identical either way.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const offset = weekStart > from ? TRAVEL : -TRAVEL;

    const animation = this.animations
      .create()
      .addElement(this.host)
      .duration(DURATION)
      .easing('ease-out')
      .fromTo('transform', `translateX(${offset}px)`, 'translateX(0)')
      .fromTo('opacity', '0', '1');

    this.running = animation;

    animation.play().then(() => {
      // Clears the inline styles so the resting state owes nothing to the
      // animation that got it there.
      animation.destroy();
      if (this.running === animation) {
        this.running = null;
      }
    });
  }
}
