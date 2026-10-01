import { expect, test, type Page } from '@playwright/test';

/** Ionic keeps earlier pages in the DOM, hidden; only the visible one counts. */
function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).locator('visible=true');
}

async function recordExpense(page: Page, description: string, amount: string, category: string) {
  await page.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByText('New expense')).toBeVisible();
  await field(page, 'What was bought').fill(description);
  await field(page, 'Amount').fill(amount);
  await page.getByRole('radio', { name: category, exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: `Edit ${description}` })).toBeVisible();
}

const weekTotal = (page: Page) => page.locator('app-expenses .t-balance');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('shell', () => {
  test('opens on Expenses with three labelled tabs and no prompt', async ({ page }) => {
    await expect(page).toHaveURL(/\/tabs\/expenses$/);
    await expect(page.locator('ion-tab-button ion-label')).toHaveText([
      'Expenses',
      'Insights',
      'Data',
    ]);
    await expect(page.getByRole('tab', { name: 'Expenses' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByText('Nothing recorded this week.')).toBeVisible();
    await expect(weekTotal(page)).toHaveText('0 ₴');
  });

  test('switches destinations from the tab bar', async ({ page }) => {
    await page.getByRole('tab', { name: 'Data' }).click();
    await expect(page.getByRole('heading', { name: 'Import' })).toBeVisible();
    await expect(page.getByText('not available yet')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Data' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Insights' }).click();
    await expect(page.getByText('Nothing was recorded in this week.')).toBeVisible();
  });
});

test.describe('expenses', () => {
  test('refuses an incomplete entry and keeps what was typed', async ({ page }) => {
    await page.getByRole('button', { name: 'Add expense' }).click();
    await field(page, 'Amount').fill('0');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Enter what you bought.')).toBeVisible();
    await expect(page.getByText('Amount must be more than zero.')).toBeVisible();
    await expect(page.getByText('Choose a category.')).toBeVisible();
    await expect(field(page, 'Amount')).toHaveValue('0');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Nothing recorded this week.')).toBeVisible();
  });

  test('records, edits and deletes an expense, keeping the totals current', async ({ page }) => {
    await recordExpense(page, 'Bread', '45,50', 'Groceries');
    await recordExpense(page, 'Cinema', '300', 'Entertainment');
    await expect(weekTotal(page)).toHaveText('345,50 ₴');

    // The most recently recorded entry is nearest the top.
    await expect(page.locator('app-expenses .entry .details > :first-child')).toHaveText([
      'Cinema',
      'Bread',
    ]);

    await page.getByRole('button', { name: 'Edit Bread' }).click();
    await expect(field(page, 'Amount')).toHaveValue('45,50');
    await field(page, 'Amount').fill('50');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(weekTotal(page)).toHaveText('350 ₴');

    await page.getByRole('button', { name: 'Edit Cinema' }).click();
    await page.getByRole('button', { name: 'Delete expense' }).click();
    await page.locator('ion-alert').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('ion-alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Delete expense' }).click();
    await page.locator('ion-alert').getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('button', { name: 'Edit Cinema' })).toHaveCount(0);
    await expect(weekTotal(page)).toHaveText('50 ₴');
  });

  test('keeps expenses across a reload', async ({ page }) => {
    await recordExpense(page, 'Bread', '45,50', 'Groceries');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Edit Bread' })).toBeVisible();
    await expect(weekTotal(page)).toHaveText('45,50 ₴');
  });

  test('moves between weeks without shifting the log', async ({ page }) => {
    await recordExpense(page, 'Bread', '45,50', 'Groceries');
    const back = page.locator('app-expenses').getByRole('button', { name: 'Back to this week' });
    const top = async () => (await page.locator('app-expenses .balance').boundingBox())?.y;

    const before = await top();
    await expect(back).toBeHidden();

    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(back).toBeVisible();
    await expect(page.getByText('Nothing recorded this week.')).toBeVisible();
    await expect.poll(top).toBe(before);

    await back.click();
    await expect(page.getByRole('button', { name: 'Edit Bread' })).toBeVisible();
    await expect(back).toBeHidden();
  });

  test('regroups weeks when the week start changes', async ({ page }) => {
    const range = page.locator('app-expenses app-week-header .range');
    const monday = (await range.textContent()) ?? '';

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('radio', { name: 'Wednesday' }).click();
    await expect(page.getByRole('radio', { name: 'Wednesday' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('button', { name: 'Close settings' }).click();

    await expect(range).not.toHaveText(monday);

    await page.reload();
    await expect(range).not.toHaveText(monday);
  });
});

test.describe('categories', () => {
  test.beforeEach(async ({ page }) => {
    await recordExpense(page, 'Bread', '45,50', 'Groceries');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Manage categories' }).click();
  });

  test('creates, validates, renames and offers a custom category', async ({ page }) => {
    const name = field(page, 'New category name');

    await name.fill('sport');
    await page.getByRole('button', { name: 'Add category' }).click();
    await expect(page.getByText('A category with that name already exists.')).toBeVisible();
    await expect(name).toHaveValue('sport');

    await name.fill('Coffee');
    await name.press('Enter');
    await expect(page.getByRole('button', { name: 'Rename Coffee' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rename Groceries' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Rename Coffee' }).click();
    await field(page, 'Rename Coffee').fill('Cafe');
    await page.getByRole('button', { name: 'Save name' }).click();
    await expect(page.getByRole('button', { name: 'Rename Cafe' })).toBeVisible();

    await page.getByRole('button', { name: 'Back to settings' }).click();
    await page.getByRole('button', { name: 'Close settings' }).click();
    await page.getByRole('button', { name: 'Add expense' }).click();
    await expect(page.getByRole('radio').first()).toHaveText('Cafe');
  });

  test('moves expenses to another category before deleting theirs', async ({ page }) => {
    await field(page, 'New category name').fill('Coffee');
    await page.getByRole('button', { name: 'Add category' }).click();
    await page.getByRole('button', { name: 'Back to settings' }).click();
    await page.getByRole('button', { name: 'Close settings' }).click();
    await recordExpense(page, 'Latte', '95', 'Coffee');

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Manage categories' }).click();
    await page.getByRole('button', { name: 'Delete Coffee' }).click();
    await expect(page.getByText('1 expense uses Coffee.')).toBeVisible();

    // Dismissing the sheet deletes nothing.
    await page.getByRole('button', { name: 'Cancel deletion' }).click();
    await expect(page.locator('ion-modal')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Delete Coffee' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete Coffee' }).click();
    await page.getByRole('button', { name: 'Move to Eating out and delete Coffee' }).click();
    await expect(page.getByRole('button', { name: 'Delete Coffee' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Back to settings' }).click();
    await page.getByRole('button', { name: 'Close settings' }).click();
    await expect(page.locator('app-expenses .entry', { hasText: 'Latte' })).toContainText(
      'Eating out',
    );
    await expect(weekTotal(page)).toHaveText('140,50 ₴');
  });
});

test.describe('import', () => {
  const CSV = [
    'Date,What,Amount,Category',
    '2026-08-03,"Milk, bread, eggs","245,50",groceries',
    '2026-08-03,Latte,95,Coffee',
    '2026-08-05,Bus,20,',
  ].join('\n');

  async function importFile(page: Page, content: string) {
    await page.getByRole('tab', { name: 'Data' }).click();
    await page.getByRole('button', { name: 'Import from CSV' }).click();
    await page.locator('input[type=file]').setInputFiles({
      name: 'expenses.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(content, 'utf8'),
    });
  }

  async function mapAndPreview(page: Page) {
    const group = (name: string) => page.getByRole('radiogroup', { name, exact: true });
    await group('Date').getByRole('radio', { name: 'Date' }).click();
    await group('Description').getByRole('radio', { name: 'What' }).click();
    await group('Amount').getByRole('radio', { name: 'Amount' }).click();
    await group('Category (optional)').getByRole('radio', { name: 'Category' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('radio', { name: 'YYYY-MM-DD' }).click();
    await page.getByRole('button', { name: 'Preview' }).click();
  }

  test('rejects a file with only a header', async ({ page }) => {
    await importFile(page, 'Date,What,Amount\n');
    await expect(page.getByText('That file has no expenses in it')).toBeVisible();
  });

  test('imports a file, then finds nothing new the second time', async ({ page }) => {
    await importFile(page, CSV);
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await mapAndPreview(page);

    await expect(page.getByText('3 expenses to import')).toBeVisible();
    await expect(page.getByText('1 new category: Coffee')).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.getByText('3 expenses imported')).toBeVisible();
    await page.getByRole('button', { name: 'View expenses' }).click();

    // The log is taken to the week the imported expenses fall in.
    await expect(page.locator('app-expenses app-week-header .range')).toHaveText('3 – 9 Aug 2026');
    await expect(page.getByRole('button', { name: 'Edit Milk, bread, eggs' })).toBeVisible();
    await expect(page.locator('app-expenses .entry', { hasText: 'Bus' })).toContainText('Other');
    await expect(weekTotal(page)).toHaveText('360,50 ₴');

    await importFile(page, CSV);
    await mapAndPreview(page);
    await expect(page.getByText('3 rows already recorded, which will be skipped')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
  });

  test('takes Insights to the imported week along with the log', async ({ page }) => {
    await importFile(page, CSV);
    await mapAndPreview(page);
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await page.getByRole('button', { name: 'View expenses' }).click();
    await expect(page.locator('app-expenses app-week-header .range')).toHaveText('3 – 9 Aug 2026');

    await page.getByRole('tab', { name: 'Insights' }).click();
    await expect(page.locator('app-insights app-week-header .range')).toHaveText('3 – 9 Aug 2026');
    await expect(page.locator('app-insights .t-balance')).toHaveText('360,50 ₴');
  });

  test('lists every invalid row and imports nothing', async ({ page }) => {
    await importFile(page, `${CSV}\nnot-a-date,Thing,5,\n2026-08-06,,5,`);
    await mapAndPreview(page);

    await expect(page.getByText('This file cannot be imported yet')).toBeVisible();
    await expect(page.getByText('Line 5')).toBeVisible();
    await expect(page.getByText('Line 6')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Cancel import' }).click();
    await page.getByRole('tab', { name: 'Expenses' }).click();
    await expect(weekTotal(page)).toHaveText('0 ₴');
  });
});

test.describe('insights', () => {
  test('sums the week by category and matches the log', async ({ page }) => {
    await recordExpense(page, 'Bread', '100', 'Groceries');
    await recordExpense(page, 'Milk', '50', 'Groceries');
    await recordExpense(page, 'Cinema', '300', 'Entertainment');

    await page.getByRole('tab', { name: 'Insights' }).click();

    await expect(page.locator('app-insights .t-balance')).toHaveText('450 ₴');
    await expect(page.locator('app-insights .category-name')).toHaveText([
      'Entertainment',
      'Groceries',
    ]);
    await expect(page.locator('app-insights .category .amount')).toHaveText(['300', '150']);

    // Measures are proportional to the largest category.
    const widths = await page
      .locator('app-insights .category .bar')
      .evaluateAll((bars) => bars.map((bar) => bar.getBoundingClientRect().width));
    expect(widths[1] / widths[0]).toBeCloseTo(0.5, 2);

    // Too little history: the comparison is absent, the rest is not.
    await expect(page.locator('app-insights .comparison')).toHaveCount(0);
  });

  test('shares its week with the log, whichever one is moved', async ({ page }) => {
    const logRange = page.locator('app-expenses app-week-header .range');
    const insightsRange = page.locator('app-insights app-week-header .range');
    const thisWeek = (await logRange.textContent()) ?? '';

    // Insights follows the log.
    await page.locator('app-expenses').getByRole('button', { name: 'Previous week' }).click();
    await expect(logRange).not.toHaveText(thisWeek);
    const lastWeek = (await logRange.textContent()) ?? '';

    await page.getByRole('tab', { name: 'Insights' }).click();
    await expect(insightsRange).toHaveText(lastWeek);

    // The log follows Insights.
    await page.locator('app-insights').getByRole('button', { name: 'Previous week' }).click();
    await expect(insightsRange).not.toHaveText(lastWeek);
    const twoWeeksAgo = (await insightsRange.textContent()) ?? '';

    await page.getByRole('tab', { name: 'Expenses' }).click();
    await expect(logRange).toHaveText(twoWeeksAgo);

    // Returning to the current week on one returns both.
    await page.locator('app-expenses').getByRole('button', { name: 'Back to this week' }).click();
    await expect(logRange).toHaveText(thisWeek);

    await page.getByRole('tab', { name: 'Insights' }).click();
    await expect(insightsRange).toHaveText(thisWeek);
    await expect(
      page.locator('app-insights').getByRole('button', { name: 'Back to this week' }),
    ).toBeHidden();
  });

  test('moves both destinations when either is swiped', async ({ page }) => {
    const logRange = page.locator('app-expenses app-week-header .range');
    const insightsRange = page.locator('app-insights app-week-header .range');
    const thisWeek = (await logRange.textContent()) ?? '';

    async function swipe(selector: string, deltaX: number) {
      const box = await page.locator(selector).boundingBox();
      if (box === null) throw new Error('nothing to swipe');
      const x = box.x + box.width / 2;
      const y = box.y + 40;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + deltaX / 2, y, { steps: 5 });
      await page.mouse.move(x + deltaX, y, { steps: 5 });
      await page.mouse.up();
    }

    // Dragging right pulls the previous week in.
    await swipe('app-expenses app-week-transition', 150);
    await expect(logRange).not.toHaveText(thisWeek);
    const lastWeek = (await logRange.textContent()) ?? '';

    await page.getByRole('tab', { name: 'Insights' }).click();
    await expect(insightsRange).toHaveText(lastWeek);

    // Dragging left goes forward again, and the log comes with it.
    await swipe('app-insights app-week-transition', -150);
    await expect(insightsRange).toHaveText(thisWeek);

    await page.getByRole('tab', { name: 'Expenses' }).click();
    await expect(logRange).toHaveText(thisWeek);
  });

  test('takes both to the week an expense is saved into', async ({ page }) => {
    const logRange = page.locator('app-expenses app-week-header .range');
    const thisWeek = (await logRange.textContent()) ?? '';

    await page.getByRole('button', { name: 'Add expense' }).click();
    await field(page, 'What was bought').fill('Old receipt');
    await field(page, 'Amount').fill('80');
    await page.getByRole('radio', { name: 'Other', exact: true }).click();

    // Date it in the previous month, which is never the week being viewed.
    await page.locator('button.date').click();
    await page.locator('ion-datetime').getByRole('button', { name: /previous month/i }).click();
    await page.locator('ion-datetime .calendar-month:nth-child(2) button[data-day="15"]').click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('button', { name: 'Edit Old receipt' })).toBeVisible();
    await expect(logRange).not.toHaveText(thisWeek);
    const savedWeek = (await logRange.textContent()) ?? '';

    await page.getByRole('tab', { name: 'Insights' }).click();
    await expect(page.locator('app-insights app-week-header .range')).toHaveText(savedWeek);
    await expect(page.locator('app-insights .t-balance')).toHaveText('80 ₴');
  });
});
