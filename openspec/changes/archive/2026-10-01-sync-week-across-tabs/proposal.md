## Why

Expenses and Insights each keep their own week, so browsing the log to an earlier week and then opening Insights shows a different week from the one just being looked at. The two destinations describe the same week of spending — one lists it, the other sums it up — and having to navigate to the same week twice makes Insights feel disconnected from the log.

## What Changes

- Expenses and Insights show the same week. Moving to another week on either destination moves the other with it, so switching tabs never changes which week is on screen.
- **BREAKING** (behaviour): the existing requirement that Insights keeps a week independent of the log is reversed.
- Anything that moves the log to a week moves Insights too: saving or editing an expense dated in another week, and "View expenses" after an import.
- Unchanged: both destinations open on the current week after a reload, the viewed week is not persisted, and each destination keeps its own previous / next / back-to-this-week controls and swipe.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `spending-insights`: the requirement "Insights presents one week at a time" is replaced by "Insights presents one week, shared with the log" — the week Insights shows is the week the expense log shows, rather than one of its own.
- `expense-tracking`: gains a requirement that the week the log shows is shared with Insights, so week navigation and saving into another week are understood to move both.

## Impact

- `src/app/core/state/week-store.ts` — the two anchors (`logAnchorDate`, `insightsAnchorDate`) become one.
- `src/app/features/expenses/expenses.page.ts`, `expense-form.page.ts`, `src/app/features/insights/insights.page.ts`, `src/app/features/data/import.page.ts` — read and write the single anchor.
- `e2e/app.spec.ts` — the test "keeps its own week, independent of the log" asserts the behaviour being removed and is replaced.
- No storage change, no new dependencies.
