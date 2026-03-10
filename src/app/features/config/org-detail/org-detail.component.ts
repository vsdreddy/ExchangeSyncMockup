import { Component, computed, inject, signal, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService, buildDefaultMappings } from '../../../core/services/data.service';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { Environment } from '../../../core/models/models';

// ── Environment Form Dialog ───────────────────────────────────────────────────
@Component({
  selector: 'app-env-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.editEnv ? 'Edit Environment' : 'New Environment' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Environment Name *</mat-label>
        <input matInput [(ngModel)]="form.name" placeholder="Production / UAT / Dev"/>
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Type</mat-label>
        <mat-select [(ngModel)]="form.type">
          @for (t of ['Production','Staging','Development','Custom']; track t) {
            <mat-option [value]="t">{{ t }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-checkbox [(ngModel)]="form.isDefault" class="mt-2">Set as default environment</mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="dialogRef.close(form)">
        {{ data.editEnv ? 'Save' : 'Create Environment' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { display: flex; flex-direction: column; gap: 8px; min-width: 420px; }
    .w-full { width: 100%; }
  `],
})
export class EnvFormDialogComponent {
  dialogRef = inject(MatDialogRef<EnvFormDialogComponent>);
  data: { editEnv: Environment | null; form: any } = inject(MAT_DIALOG_DATA);
  form: any;

  constructor() {
    this.form = { ...this.data.form };
  }
}

// ── Org Detail ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-org-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, BadgeComponent,
    MatToolbarModule, MatButtonModule, MatCardModule, MatDialogModule,
  ],
  template: `
    @if (org()) {
      <mat-toolbar class="topbar">
        <button mat-button (click)="router.navigate(['/config'])">← Applications</button>
        <div class="breadcrumb">
          <span class="bc-link" (click)="router.navigate(['/config'])">Applications</span>
          <span class="bc-sep">/</span>
          <span class="bc-current">{{ org()!.name }}</span>
        </div>
        <div class="d-flex gap-2 ml-auto">
          <span class="font-mono text-muted text-xs">{{ org()!.salesforceInstanceUrl }}</span>
          <app-badge [status]="org()!.status" />
        </div>
      </mat-toolbar>

      <div class="content-scroll">
        <div class="d-flex justify-between align-center mb-4">
          <div>
            <div class="page-title">{{ org()!.name }}</div>
            <div class="page-subtitle">{{ org()!.environments.length }} environment(s)</div>
          </div>
          <button mat-raised-button color="primary" (click)="openAdd()">+ New Environment</button>
        </div>

        @if (org()!.environments.length === 0) {
          <div class="empty-state">
            <span class="empty-icon">🌍</span>
            <p>No environments configured yet.</p>
            <button mat-raised-button color="primary" (click)="openAdd()">Create Environment</button>
          </div>
        } @else {
          <mat-card>
            <mat-card-content>
              <table class="table">
                <thead>
                  <tr>
                    <th>Environment</th><th>Type</th><th>Salesforce</th>
                    <th>Exchange</th><th>Google</th><th>Users</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (env of org()!.environments; track env.envId) {
                    <tr class="clickable"
                      (click)="router.navigate(['/config', org()!.orgId, 'env', env.envId])">
                      <td>
                        <div style="font-weight:500">{{ env.name }}</div>
                        @if (env.isDefault) {
                          <span class="badge badge-green" style="font-size:9px">Default</span>
                        }
                      </td>
                      <td><app-badge [status]="env.type" /></td>
                      <td>{{ env.sfConfig ? (env.sfConfig.isVerified ? '✓' : '○') : '—' }}</td>
                      <td>{{ env.exchangeConfig ? (env.exchangeConfig.isVerified ? '✓' : '○') : '—' }}</td>
                      <td>{{ env.googleConfig ? (env.googleConfig.isVerified ? '✓' : '○') : '—' }}</td>
                      <td>{{ env.users.length }}</td>
                      <td><app-badge [status]="env.status" /></td>
                      <td (click)="$event.stopPropagation()">
                        <div class="d-flex gap-2">
                          <button mat-stroked-button style="font-size:11px;line-height:28px;padding:0 8px"
                            (click)="router.navigate(['/config', org()!.orgId, 'env', env.envId])">
                            Open
                          </button>
                          <button mat-button style="font-size:11px;line-height:28px;padding:0 8px"
                            (click)="openEdit(env)">Edit</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `,
  styles: [`
    mat-card { padding: 0 !important; }
    mat-card-content { padding: 0 !important; margin: 0 !important; }
    .topbar { background: var(--surface) !important; border-bottom: 1px solid var(--border); box-shadow: var(--shadow-sm); height: 48px; min-height: 48px; padding: 0 24px; gap: 12px; }
  `],
})
export class OrgDetailComponent implements OnInit {
  data   = inject(DataService);
  router = inject(Router);
  route  = inject(ActivatedRoute);
  dialog = inject(MatDialog);

  orgId = '';
  org   = computed(() => this.data.orgs().find(o => o.orgId === this.orgId));

  ngOnInit(): void {
    this.orgId = this.route.snapshot.paramMap.get('orgId') ?? '';
  }

  openAdd(): void {
    const ref = this.dialog.open(EnvFormDialogComponent, {
      data: {
        editEnv: null,
        form: { name: '', type: 'Development', isDefault: false },
      },
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const org = this.org();
      if (!org) return;
      this.data.addEnv(org.orgId, {
        envId: `env-${Date.now()}`,
        orgId: org.orgId,
        status: 'Active',
        sfConfig: null,
        exchangeConfig: null,
        googleConfig: null,
        mappings: buildDefaultMappings(),
        users: [],
        ...result,
      });
    });
  }

  openEdit(env: Environment): void {
    const ref = this.dialog.open(EnvFormDialogComponent, {
      data: {
        editEnv: env,
        form: { name: env.name, type: env.type, isDefault: env.isDefault },
      },
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const org = this.org();
      if (!org) return;
      this.data.updateEnv(org.orgId, { ...env, ...result });
    });
  }
}
