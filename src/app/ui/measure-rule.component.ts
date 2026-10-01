import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

function toPercent(fraction: number): number {
  return Math.min(1, Math.max(0, fraction)) * 100;
}

/**
 * A rule whose length carries a magnitude rather than a boundary — the app's
 * chart vocabulary. Quantity is shown by drawing the ledger's own rule to
 * length, never by colour: there is no accent anywhere in it.
 *
 * | element      | weight | colour        |
 * |--------------|--------|---------------|
 * | hairline     | 1px    | `rule`        |
 * | closing rule | 2px    | `rule-strong` |
 * | measure      | 4px    | `rule-strong` |
 * | marker       | 2px wide, 12px tall | `text` |
 *
 * The measure is told from the hairline by weight, and from the closing rule by
 * weight and by not spanning the width. The marker is perpendicular and in ink,
 * so it reads as an annotation on the measure rather than as more rule-work.
 *
 * Hidden from assistive technology: the figure beside a measure is what carries
 * its value, exactly as it is for the closing rule.
 */
@Component({
  selector: 'app-measure-rule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @if (fraction() > 0) {
      <div class="bar" [style.width.%]="width()"></div>
    }
    @if (marker() !== null) {
      <div class="marker" [style.left.%]="markerLeft()"></div>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      height: 12px;
    }

    .bar {
      position: absolute;
      left: 0;
      top: 4px;
      height: 4px;
      /* A value worth a rounding error still draws something: small, not
         absent. */
      min-width: 4px;
      background: var(--ledger-rule-strong);
    }

    .marker {
      position: absolute;
      top: 0;
      width: 2px;
      height: 12px;
      margin-left: -1px;
      background: var(--ledger-text);
    }
  `,
})
export class MeasureRuleComponent {
  /** The share of the available width to draw, from 0 to 1. */
  readonly fraction = input.required<number>();

  /** Where a reference value falls on the same scale, from 0 to 1. */
  readonly marker = input<number | null>(null);

  protected readonly width = computed(() => toPercent(this.fraction()));
  protected readonly markerLeft = computed(() => toPercent(this.marker() ?? 0));
}
