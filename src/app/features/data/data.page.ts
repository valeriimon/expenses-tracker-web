import { Component, inject } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar, NavController } from '@ionic/angular';

/**
 * The Data destination: getting expenses in, and eventually back out.
 *
 * Export is named but has no action. Announcing the destination's full purpose
 * costs a paragraph; offering a button that does nothing costs trust.
 */
@Component({
  selector: 'app-data',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Data</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page">
        <section class="section">
          <h2 class="t-heading">Import</h2>
          <p class="t-body muted">
            Bring in expenses from a CSV file — a spreadsheet export, for instance. You choose
            which of the file's columns holds the date, the description, the amount, and the
            category, and you see what will be imported before anything is written.
          </p>
          <div class="action-row">
            <ion-button class="action" (click)="startImport()">Import from CSV</ion-button>
          </div>
        </section>

        <section class="section later">
          <h2 class="t-heading">Export</h2>
          <p class="t-body muted">
            Saving your expenses out to a file is not available yet. It will appear here.
          </p>
        </section>
      </div>
    </ion-content>
  `,
  styles: `
    .section {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    h2 {
      margin: 0;
    }

    .later {
      margin-top: var(--space-xl);
    }

    .action-row {
      margin-top: var(--space-sm);
    }
  `,
})
export class DataPage {
  private readonly nav = inject(NavController);

  protected startImport(): void {
    this.nav.navigateForward('/data/import');
  }
}
