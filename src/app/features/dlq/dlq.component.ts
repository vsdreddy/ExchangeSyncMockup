import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DataService } from '../../core/services/data.service';
import { BadgeComponent, PlatformBadgeComponent } from '../../shared/components/badge.component';
import { DlqItem } from '../../core/models/models';

@Component({
  selector: 'app-dlq',
  standalone: true,
  imports: [
    CommonModule, FormsModule, BadgeComponent, PlatformBadgeComponent,
    MatToolbarModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatSelectModule, MatCheckboxModule,
  ],
  template: `
    <mat-toolbar class="topbar">
      <span class="topbar-title">DLQ Manager</span>
      <button mat-stroked-button class="ml-auto">⟳&nbsp; Refresh</button>
    </mat-toolbar>

    <div class="content-scroll">
      <div class="page-header">
        <div class="page-title">Dead Letter Queue</div>
        <div class="page-subtitle">Failed sync events requiring manual intervention</div>
      </div>

      <!-- Stats -->
      <div class="three-col">
        <div class="kpi-card red">
          <div class="kpi-label">Dead Messages</div>
          <div class="kpi-value">{{ deadCount() }}</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-label">Retrying</div>
          <div class="kpi-value">{{ retryCount() }}</div>
        </div>
        <div class="kpi-card accent">
          <div class="kpi-label">Total in Queue</div>
          <div class="kpi-value">{{ data.dlqItems().length }}</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="d-flex align-center gap-2 mb-4" style="flex-wrap:wrap">
        <mat-form-field appearance="outline" style="width:160px">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="filterStatus">
            <mat-option value="All">All</mat-option>
            <mat-option value="Dead">Dead</mat-option>
            <mat-option value="Retrying">Retrying</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:210px">
          <mat-label>Application</mat-label>
          <mat-select [(ngModel)]="filterOrg">
            <mat-option value="All">All</mat-option>
            @for (o of orgNames; track o) { <mat-option [value]="o">{{ o }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <div class="flex-1"></div>
        @if (selected().size > 0) {
          <span class="text-sm text-muted">{{ selected().size }} selected</span>
          <button mat-stroked-button color="warn" (click)="bulkRetry()">⟳&nbsp; Retry Selected</button>
          <button mat-stroked-button color="warn" (click)="bulkDismiss()">✕&nbsp; Dismiss</button>
        }
      </div>

      @if (filtered().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">✓</span>
          <p>No messages in queue matching filters.</p>
        </div>
      } @else {
        <mat-card>
          <mat-card-content>
            <table class="table">
              <thead>
                <tr>
                  <th style="width:36px">
                    <mat-checkbox
                      [checked]="selected().size === filtered().length && filtered().length > 0"
                      (change)="toggleAll()"/>
                  </th>
                  <th>Event Type</th>
                  <th>Application / Env</th>
                  <th>Platform</th>
                  <th>Attempts</th>
                  <th>Last Attempt</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filtered(); track item.id) {
                  <tr class="clickable" (click)="toggleExpand(item.id)">
                    <td (click)="$event.stopPropagation()">
                      <mat-checkbox
                        [checked]="selected().has(item.id)"
                        (change)="toggleSelect(item.id)"/>
                    </td>
                    <td>
                      <span class="font-mono" style="font-weight:500">{{ item.eventType }}</span>
                      <span class="text-xs text-muted" style="margin-left:4px">
                        {{ expanded() === item.id ? '▲' : '▼' }}
                      </span>
                    </td>
                    <td>
                      <div style="font-weight:500">{{ item.org }}</div>
                      <div class="text-xs text-muted">{{ item.env }}</div>
                    </td>
                    <td><app-platform-badge [platform]="item.platform" /></td>
                    <td>
                      <span style="font-weight:600"
                        [style.color]="item.attempts >= 3 ? 'var(--red)' : 'var(--amber)'">
                        {{ item.attempts }}
                      </span>
                      <span class="text-xs text-muted"> / 3</span>
                    </td>
                    <td><span class="font-mono">{{ item.lastAttempt }}</span></td>
                    <td><app-badge [status]="item.status" /></td>
                    <td (click)="$event.stopPropagation()">
                      <div class="d-flex gap-2">
                        <button mat-stroked-button style="font-size:11px;line-height:28px;padding:0 8px" (click)="data.retryDlq(item.id)">⟳ Retry</button>
                        <button mat-icon-button style="color:var(--red);width:28px;height:28px;line-height:28px"
                          (click)="data.dismissDlq(item.id)">✕</button>
                      </div>
                    </td>
                  </tr>
                  @if (expanded() === item.id) {
                    <tr>
                      <td colspan="8" style="padding:0;background:var(--surface-2)">
                        <div class="dlq-expanded">
                          <div class="section-label mb-3">Error Detail</div>
                          <div class="error-box">{{ item.error }}</div>
                          <div class="d-flex gap-3 mt-3 text-xs text-muted">
                            <span>ID: <span class="font-mono">{{ item.id }}</span></span>
                            <span>·</span>
                            <span>Attempts: <strong style="color:var(--text-1)">{{ item.attempts }}</strong></span>
                            <span>·</span>
                            <span>Last: <span class="font-mono">{{ item.lastAttempt }}</span></span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  }
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
export class DlqComponent {
  data = inject(DataService);

  filterStatus = 'All';
  filterOrg    = 'All';
  expanded     = signal<string | null>(null);
  selected     = signal<Set<string>>(new Set());

  orgNames = [...new Set(this.data.dlqItems().map(d => d.org))];

  deadCount  = computed(() => this.data.dlqItems().filter(d => d.status === 'Dead').length);
  retryCount = computed(() => this.data.dlqItems().filter(d => d.status === 'Retrying').length);

  filtered = computed(() =>
    this.data.dlqItems().filter(d =>
      (this.filterStatus === 'All' || d.status === this.filterStatus) &&
      (this.filterOrg === 'All' || d.org === this.filterOrg)
    )
  );

  toggleExpand(id: string): void {
    this.expanded.update(cur => cur === id ? null : id);
  }

  toggleSelect(id: string): void {
    this.selected.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleAll(): void {
    const ids = this.filtered().map(d => d.id);
    this.selected.update(s =>
      s.size === ids.length ? new Set() : new Set(ids)
    );
  }

  bulkRetry(): void {
    [...this.selected()].forEach(id => this.data.retryDlq(id));
    this.selected.set(new Set());
  }

  bulkDismiss(): void {
    [...this.selected()].forEach(id => this.data.dismissDlq(id));
    this.selected.set(new Set());
  }
}
