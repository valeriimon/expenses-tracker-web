import { Component, signal } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  statsChart,
  statsChartOutline,
  swapHorizontal,
  swapHorizontalOutline,
  wallet,
  walletOutline,
} from 'ionicons/icons';

import { TAB_BAR_ID } from '../core/state/update.service';

/**
 * The app's three top-level destinations. Each tab carries a label as well as
 * an icon, and the active one is told apart by its filled icon as well as by
 * colour.
 */
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  /** Lets a notice anchor itself above the tab bar rather than over it. */
  protected readonly tabBarId = TAB_BAR_ID;

  protected readonly tabs = [
    { tab: 'expenses', label: 'Expenses', icon: 'wallet' },
    { tab: 'insights', label: 'Insights', icon: 'stats-chart' },
    { tab: 'data', label: 'Data', icon: 'swap-horizontal' },
  ];

  /** The active tab, which is what picks the filled icon over the outline. */
  protected readonly selected = signal('expenses');

  constructor() {
    addIcons({
      statsChart,
      statsChartOutline,
      swapHorizontal,
      swapHorizontalOutline,
      wallet,
      walletOutline,
    });
  }
}
