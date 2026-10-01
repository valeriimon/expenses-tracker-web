import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The rule that closes a set of entries beneath their sum.
 *
 * One rule, drawn heavier than a hairline and in the stronger of the two rule
 * colours. It started as an accounting double rule — the convention for closing
 * an account — but a double rule at this size reads as a rendering artefact
 * rather than as a mark someone chose. The weight carries the same meaning
 * without inviting the question.
 *
 * It belongs in exactly one place per view: under the outermost total. Peers
 * are separated by a plain hairline in the `rule` colour instead.
 */
@Component({
  selector: 'app-balance-rule',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      display: block;
      /* A hairline is 1px on the web, so this has to be visibly more than
         that to distinguish the week's close from an ordinary separator. */
      height: 2px;
      background: var(--ledger-rule-strong);
    }
  `,
})
export class BalanceRuleComponent {}
