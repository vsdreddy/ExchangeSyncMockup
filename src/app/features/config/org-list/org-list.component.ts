import { Component, inject, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '../../../core/services/data.service';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { Organisation } from '../../../core/models/models';

// ── Org Form Dialog ──────────────────────────────────────────────────────────
@Component({
  selector: 'app-org-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatRadioModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.editTarget ? 'Edit Application' : 'New Application' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Application Name *</mat-label>
        <input matInput [(ngModel)]="form.name" (ngModelChange)="autoSlug($event)" placeholder="Client Management"/>
      </mat-form-field>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>URL Slug *</mat-label>
        <input matInput [(ngModel)]="form.slug" placeholder="acme-corp"/>
      </mat-form-field>
      <div class="text-xs text-muted mb-3">Lowercase, no spaces. Used in API paths.</div>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Salesforce Instance URL *</mat-label>
        <input matInput [(ngModel)]="form.salesforceInstanceUrl" placeholder="https://yourorg.my.salesforce.com"/>
      </mat-form-field>
      <div class="field">
        <div class="text-xs text-muted mb-2" style="font-weight:500">Status</div>
        <mat-radio-group [(ngModel)]="form.status" class="radio-group-vert">
          @for (s of ['Active','Suspended','Archived']; track s) {
            <mat-radio-button [value]="s">{{ s }}</mat-radio-button>
          }
        </mat-radio-group>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="dialogRef.close(form)">
        {{ data.editTarget ? 'Save Changes' : 'Create Application' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { display: flex; flex-direction: column; gap: 4px; min-width: 480px; }
    .w-full { width: 100%; }
    .radio-group-vert { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
  `],
})
export class OrgFormDialogComponent {
  dialogRef = inject(MatDialogRef<OrgFormDialogComponent>);
  data: { editTarget: Organisation | null; form: any } = inject(MAT_DIALOG_DATA);
  form: any;

  constructor() {
    this.form = { ...this.data.form };
  }

  autoSlug(name: string): void {
    if (!this.data.editTarget) {
      this.form.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
  }
}

// ── Org List ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-org-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, BadgeComponent,
    MatToolbarModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatDialogModule,
  ],
  template: `
    <mat-toolbar class="topbar">
      <div class="breadcrumb">
        <span class="bc-current">Configuration</span>
        <span class="bc-sep">/</span>
        <span>Applications</span>
      </div>
    </mat-toolbar>

    <div class="content-scroll">
      <div class="d-flex justify-between align-center mb-4">
        <div>
          <div class="page-title">Applications</div>
          <div class="page-subtitle">{{ data.orgs().length }} registered applications</div>
        </div>
        <div class="d-flex gap-2">
          <mat-form-field appearance="outline" style="width:240px">
            <mat-label>Search applications…</mat-label>
            <input matInput [(ngModel)]="search"/>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="openAdd()">+ New Application</button>
        </div>
      </div>

      @if (filtered().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">🏢</span>
          <p>{{ data.orgs().length === 0 ? 'No applications yet.' : 'No results.' }}</p>
          @if (data.orgs().length === 0) {
            <button mat-raised-button color="primary" (click)="openAdd()">Add Application</button>
          }
        </div>
      } @else {
        <mat-card>
          <mat-card-content>
            <table class="table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Salesforce Instance</th>
                  <th>Environments</th>
                  <th>Users</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (org of filtered(); track org.orgId) {
                  <tr class="clickable" (click)="router.navigate(['/config', org.orgId])">
                    <td>
                      <div style="font-weight:500">{{ org.name }}</div>
                      <div class="font-mono">{{ org.slug }}</div>
                    </td>
                    <td><span class="font-mono">{{ org.salesforceInstanceUrl }}</span></td>
                    <td>{{ org.environments.length }}</td>
                    <td>{{ totalUsers(org) }}</td>
                    <td><app-badge [status]="org.status" /></td>
                    <td (click)="$event.stopPropagation()">
                      <div class="d-flex gap-2">
                        <button mat-stroked-button style="font-size:11px;line-height:28px;padding:0 8px"
                          (click)="router.navigate(['/config', org.orgId])">Open</button>
                        <button mat-button style="font-size:11px;line-height:28px;padding:0 8px"
                          (click)="openEdit(org)">Edit</button>
                        <button mat-icon-button style="width:28px;height:28px;line-height:28px"
                          [title]="isPinned(org.orgId) ? 'Unpin' : 'Pin to sidebar'"
                          [style.color]="isPinned(org.orgId) ? 'var(--amber)' : 'var(--text-3)'"
                          (click)="data.togglePin(org.orgId)">
                          {{ isPinned(org.orgId) ? '📌' : '📍' }}
                        </button>
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
  `,
  styles: [`
    mat-card { padding: 0 !important; }
    mat-card-content { padding: 0 !important; margin: 0 !important; }
    .topbar { background: var(--surface) !important; border-bottom: 1px solid var(--border); box-shadow: var(--shadow-sm); height: 48px; min-height: 48px; padding: 0 24px; gap: 12px; }
    mat-form-field { margin-bottom: -1.25em; }
  `],
})
export class OrgListComponent {
  data   = inject(DataService);
  router = inject(Router);
  dialog = inject(MatDialog);

  search = '';

  filtered = () =>
    this.data.orgs().filter(o =>
      (o.name + o.salesforceInstanceUrl).toLowerCase().includes(this.search.toLowerCase())
    );

  totalUsers = (org: Organisation) =>
    org.environments.reduce((n, e) => n + e.users.length, 0);

  isPinned = (id: string) => this.data.pinnedOrgIds().includes(id);

  openAdd(): void {
    const ref = this.dialog.open(OrgFormDialogComponent, {
      data: {
        editTarget: null,
        form: { name: '', slug: '', salesforceInstanceUrl: '', status: 'Active' },
      },
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.data.addOrg({
          orgId: `org-${Date.now()}`,
          environments: [],
          ...result,
        });
      }
    });
  }

  openEdit(org: Organisation): void {
    const ref = this.dialog.open(OrgFormDialogComponent, {
      data: {
        editTarget: org,
        form: { name: org.name, slug: org.slug, salesforceInstanceUrl: org.salesforceInstanceUrl, status: org.status },
      },
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.data.updateOrg({ ...org, ...result });
      }
    });
  }
}
