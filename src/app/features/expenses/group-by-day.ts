import type { Expense } from '../../core/db/expenses';
import { formatDayLabel, type IsoDate } from '../../core/lib/dates';

/** One day's expenses, with what the day cost. */
export type DaySection = {
  date: IsoDate;
  title: string;
  totalMinor: number;
  expenses: Expense[];
};

/**
 * Turns the flat, ordered query result into day sections with their totals, and
 * the week total, in a single pass.
 *
 * Correctness rests on `listWeek` ordering by day, most recent first: rows for
 * a day arrive together, so a section break is just "the date changed". Days
 * with no expenses never appear, because only a row can create a section.
 */
export function groupByDay(expenses: Expense[]): {
  sections: DaySection[];
  totalMinor: number;
} {
  const sections: DaySection[] = [];
  let current: DaySection | null = null;
  let totalMinor = 0;

  for (const expense of expenses) {
    if (current === null || current.date !== expense.occurredOn) {
      current = {
        date: expense.occurredOn,
        title: formatDayLabel(expense.occurredOn),
        totalMinor: 0,
        expenses: [],
      };
      sections.push(current);
    }

    current.expenses.push(expense);
    current.totalMinor += expense.amountMinor;
    totalMinor += expense.amountMinor;
  }

  return { sections, totalMinor };
}
