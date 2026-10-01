import { Routes } from '@angular/router';

/**
 * The three destinations live under `tabs`. Everything else is pushed over
 * them: the entry form, settings, and the import are tasks the user goes into
 * and comes back from, not places the tab bar should stay visible beside.
 */
export const routes: Routes = [
  {
    path: 'expense/new',
    loadComponent: () =>
      import('./features/expenses/expense-form.page').then((m) => m.ExpenseFormPage),
  },
  {
    path: 'expense/:id',
    loadComponent: () =>
      import('./features/expenses/expense-form.page').then((m) => m.ExpenseFormPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'settings/categories',
    loadComponent: () =>
      import('./features/settings/categories.page').then((m) => m.CategoriesPage),
  },
  {
    path: 'data/import',
    loadComponent: () => import('./features/data/import.page').then((m) => m.ImportPage),
  },
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
];
