import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatToolbarModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  template: `
    <mat-toolbar class="topbar">
      <span class="topbar-title">Audit Log</span>
      <button mat-stroked-button class="ml-auto">⬇&nbsp; Export CSV</button>
    </mat-toolbar>

    <div class="content-scroll">
      <div class="page-header">
        <div class="page-title">Audit Log</div>
        <div class="page-subtitle">Full history of configuration changes and system events</div>
      </div>

      <!-- Summary -->
      <div class="grid-4 mb-4" style="gap:12px">
        @for (s of summaryCards; track s.label) {
          <div class="card-sm d-flex justify-between align-center">
            <span class="text-sm text-muted">{{ s.label }}</span>
            <span style="font-weight:600;font-size:16px">{{ s.val }}</span>
          </div>
        }
      </div>

      <!-- Toolbar -->
      <div class="d-flex align-center gap-2 mb-4" style="flex-wrap:wrap">
        <mat-form-field appearance="outline" style="width:240px">
          <mat-label>Search events…</mat-label>
          <input matInput [(ngModel)]="search"/>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:180px">
          <mat-label>Application</mat-label>
          <mat-select [(ngModel)]="filterOrg">
            <mat-option value="">All Orgs</mat-option>
            @for (o of orgNames; track o) { <mat-option [value]="o">{{ o }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <div class="d-flex gap-1" style="flex-wrap:wrap">
          @for (cat of categories; track cat) {
            <button
              [attr.mat-raised-button]="filterCat === cat ? '' : null"
              [attr.mat-stroked-button]="filterCat !== cat ? '' : null"
              style="padding:4px 10px;font-size:11px;cursor:pointer;border-radius:4px;border:1px solid var(--border-2);background:var(--surface)"
              [style.background]="filterCat === cat ? 'var(--accent)' : 'var(--surface)'"
              [style.color]="filterCat === cat ? '#fff' : 'var(--text-2)'"
              (click)="filterCat = cat">{{ cat }}</button>
          }
        </div>
        <span class="ml-auto text-xs text-muted">{{ filtered().length }} events</span>
      </div>

      @if (filtered().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p>No events match your search.</p>
        </div>
      } @else {
        <mat-card>
          <mat-card-content>
            <table class="table">
              <thead>
                <tr>
                  <th style="width:140px">Timestamp</th>
                  <th style="width:150px">Action</th>
                  <th style="width:160px">Actor</th>
                  <th>Resource</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of filtered(); track entry.id) {
                  <tr>
                    <td><span class="font-mono">{{ entry.ts }}</span></td>
                    <td>
                      <span class="action-badge" [ngClass]="entry.action.split('.')[0]">
                        {{ entry.action }}
                      </span>
                    </td>
                    <td>
                      <span class="text-sm"
                        [style.color]="entry.user === 'system' ? 'var(--text-3)' : 'var(--text-1)'">
                        {{ entry.user === 'system' ? '⚙ system' : entry.user }}
                      </span>
                    </td>
                    <td><span class="text-sm">{{ entry.resource }}</span></td>
                    <td><span class="text-sm">{{ entry.detail }}</span></td>
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
    .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); }
  `],
})
export class AuditComponent {
  data = inject(DataService);

  search    = '';
  filterCat = 'All';
  filterOrg = '';

  categories = ['All','Config','Sync','User','Token','Env','Mapping','Org'];
  orgNames   = [...new Set(this.data.auditEntries().map(a => a.resource.split('/')[0].trim()))];

  summaryCards = [
    { label: 'Events today',   val: '24' },
    { label: 'Config changes', val: '6' },
    { label: 'Sync events',    val: '12' },
    { label: 'Auth events',    val: '4' },
  ];

  filtered = computed(() =>
    this.data.auditEntries().filter(a => {
      const cat = a.action.split('.')[0];
      return (this.filterCat === 'All' || cat === this.filterCat) &&
             (!this.filterOrg || a.resource.includes(this.filterOrg)) &&
             (!this.search || (a.detail + a.resource).toLowerCase().includes(this.search.toLowerCase()));
    })
  );
}
