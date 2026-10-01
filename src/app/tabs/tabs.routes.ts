import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'expenses',
        loadComponent: () =>
          import('../features/expenses/expenses.page').then((m) => m.ExpensesPage),
      },
      {
        path: 'insights',
        loadComponent: () =>
          import('../features/insights/insights.page').then((m) => m.InsightsPage),
      },
      {
        path: 'data',
        loadComponent: () => import('../features/data/data.page').then((m) => m.DataPage),
      },
      {
        path: '',
        redirectTo: '/tabs/expenses',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/expenses',
    pathMatch: 'full',
  },
];
