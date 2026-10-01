## 1. One shared week

- [x] 1.1 In `src/app/core/state/week-store.ts`, replace `logAnchorDate` and `insightsAnchorDate` with a single `anchorDate` signal (initialised to today, not persisted) and rewrite the class comment, which currently explains why the two are separate; verify `npm run build` reports every remaining reference to the old names
- [x] 1.2 Point `expenses.page.ts`, `expense-form.page.ts`, `insights.page.ts`, and `import.page.ts` at `anchorDate`, and update the Insights page comment that says its week moves independently of the log; verify `npm run build` and `npm run lint` pass with no reference to `logAnchorDate` or `insightsAnchorDate` left in `src/`

## 2. Tests

- [x] 2.1 In `e2e/app.spec.ts`, replace the test "keeps its own week, independent of the log" with one that moves the log to the previous week, opens Insights and sees the same range, moves Insights back a further week, returns to the log and sees that range, then uses "Back to this week" on the log and sees Insights on the current week; verify the test passes
- [x] 2.2 Add an end-to-end test that imports a file dated in a past week, chooses "View expenses", opens Insights, and sees the same week range and the imported total; verify the test passes
- [x] 2.3 Verify `npm test` and `npm run e2e` pass in full

## 3. Specs and docs

- [x] 3.1 Update the `WeekStore` line in `CLAUDE.md` ("per-destination week anchors") to describe the single shared week, and verify no other wording in `CLAUDE.md` or `openspec/config.yaml` describes the weeks as independent
- [x] 3.2 Walk the scenarios in both delta specs in the running app, including the swipe on each destination, and note any that fail; then run `openspec validate sync-week-across-tabs --strict` and verify it passes
