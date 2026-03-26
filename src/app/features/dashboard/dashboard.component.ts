import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DataService, MOCK_AUDIT } from '../../core/services/data.service';
import { BadgeComponent } from '../../shared/components/badge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BadgeComponent, MatToolbarModule, MatButtonModule, MatCardModule],
  template: `
    <!-- Topbar -->
    <mat-toolbar class="topbar">
      <span class="topbar-title">Dashboard</span>
      <span class="ml-auto font-mono text-muted text-xs">Exchange Sync Admin Console</span>
      <button mat-stroked-button (click)="null">⟳&nbsp; Refresh</button>
    </mat-toolbar>

    <div class="content-scroll">
      <div class="page-header">
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">Operational overview — all applications</div>
      </div>

      <!-- KPI row -->
      <div class="kpi-grid">
        <div class="kpi-card accent">
          <div class="kpi-label">Total Users</div>
          <div class="kpi-value">{{ totalUsers() }}</div>
          <div class="kpi-trend up">↑ +3 this week</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-label">Healthy Users</div>
          <div class="kpi-value">{{ healthyUsers() }}/{{ totalUsers() }}</div>
          <div class="kpi-trend up">↑ {{ healthyPct() }}% healthy</div>
        </div>
        <div class="kpi-card accent">
          <div class="kpi-label">Active Environments</div>
          <div class="kpi-value">{{ envCount() }}</div>
          <div class="kpi-trend neutral">· {{ orgCount() }} applications</div>
        </div>
        <div class="kpi-card" [class]="dlqDead() > 0 ? 'red' : 'green'">
          <div class="kpi-label">DLQ Dead Letters</div>
          <div class="kpi-value">{{ dlqDead() }}</div>
          <div class="kpi-trend" [class]="dlqDead() > 0 ? 'down' : 'up'">
            {{ dlqDead() > 0 ? '↓ Need attention' : '↑ All clear' }}
          </div>
        </div>
      </div>

      <!-- Row 2 -->
      <div class="two-col">
        <!-- Sync volume chart -->
        <mat-card>
          <mat-card-content>
            <div class="card-header">
              <span class="card-title">Sync Events — Last 12 Hours</span>
              <span class="text-xs text-muted">All applications</span>
            </div>
            <div class="card-body">
              <div class="d-flex justify-between mb-3">
                <div>
                  <div style="font-size:22px;font-weight:600;color:var(--accent)">2,628</div>
                  <div class="text-xs text-muted">events synced today</div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:16px;font-weight:600;color:var(--red)">17</div>
                  <div class="text-xs text-muted">errors</div>
                </div>
              </div>
              <!-- Bar chart -->
              <div class="bar-chart">
                @for (b of bars; track $index; let last=$last) {
                  <div class="bar" [class.bar-current]="last"
                    [style.height.%]="(b / maxBar) * 100"></div>
                }
              </div>
              <div class="d-flex justify-between mt-2">
                <span class="text-xs text-muted">12h ago</span>
                <span class="text-xs text-muted">Now</span>
              </div>
              <div class="divider"></div>
              <div class="grid-3" style="text-align:center">
                <div><div style="font-weight:600;font-size:15px">1,204</div><div class="text-xs text-muted">📅 Calendar</div></div>
                <div><div style="font-weight:600;font-size:15px">644</div><div class="text-xs text-muted">👤 Contact</div></div>
                <div><div style="font-weight:600;font-size:15px">521</div><div class="text-xs text-muted">✅ Task</div></div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Env health -->
        <mat-card>
          <mat-card-content>
            <div class="card-header">
              <span class="card-title">Environment Health</span>
              <span class="text-xs text-muted">
                {{ healthyEnvs().length }}/{{ orgHealthList().length }} healthy
              </span>
            </div>
            <div class="card-body" style="padding:10px 18px">
              @for (h of orgHealthList(); track h.name) {
                <div class="health-row">
                  <div class="health-dot"
                    [style.background]="h.status==='Healthy' ? 'var(--green)' : h.status==='Warning' ? 'var(--amber)' : 'var(--red)'">
                  </div>
                  <div style="flex:1">
                    <div style="font-size:13px;font-weight:500">{{ h.name }}</div>
                    @if (h.issues.length) {
                      <div class="text-xs text-muted">{{ h.issues.join(', ') }} not verified</div>
                    }
                  </div>
                  <app-badge [status]="h.status" />
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Row 3 -->
      <div class="two-col">
        <!-- Platform split -->
        <mat-card>
          <mat-card-content>
            <div class="card-header"><span class="card-title">Platform Distribution</span></div>
            <div class="card-body">
              @for (p of platforms(); track p.label) {
                <div style="margin-bottom:16px">
                  <div class="d-flex justify-between mb-2">
                    <span style="font-size:13px">{{ p.label }}</span>
                    <span style="font-size:13px;font-weight:600">{{ p.users }} users</span>
                  </div>
                  <div style="height:4px;background:var(--surface-3);border-radius:2px">
                    <div [style.width.%]="p.pct" [style.background]="p.color"
                      style="height:4px;border-radius:2px;transition:width .5s ease"></div>
                  </div>
                </div>
              }
              <div class="divider"></div>
              <div style="text-align:center">
                <div style="font-size:18px;font-weight:600;color:var(--accent)">1,583</div>
                <div class="text-xs text-muted">Exchange syncs today</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Activity feed -->
        <mat-card>
          <mat-card-content>
            <div class="card-header">
              <span class="card-title">Recent Activity</span>
              <span class="text-xs text-accent" style="cursor:pointer"
                (click)="router.navigate(['/audit'])">View all →</span>
            </div>
            <div class="card-body" style="padding:6px 18px">
              @for (a of recentActivity; track a.id) {
                <div class="feed-item">
                  <div class="feed-dot" [style.background]="actionColor(a.action)"></div>
                  <div style="flex:1;min-width:0">
                    <div class="text-sm truncate" style="font-weight:500">{{ a.detail }}</div>
                    <div class="text-xs text-muted">{{ a.resource }}</div>
                  </div>
                  <div class="feed-time">{{ a.ts.split(' ')[1] }}</div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    mat-card { padding: 0 !important; }
    mat-card-content { padding: 0 !important; margin: 0 !important; }
    .topbar { background: var(--surface) !important; border-bottom: 1px solid var(--border); box-shadow: var(--shadow-sm); height: 48px; min-height: 48px; padding: 0 24px; gap: 12px; }
  `],
})
export class DashboardComponent {
  data   = inject(DataService);
  router = inject(Router);

  bars    = [142,189,203,176,211,248,194,229,261,188,312,274];
  maxBar  = Math.max(...[142,189,203,176,211,248,194,229,261,188,312,274]);

  recentActivity = MOCK_AUDIT.slice(0, 6);

  totalUsers   = computed(() => this.data.orgs().flatMap(o => o.environments).flatMap(e => e.users).length);
  healthyUsers = computed(() => this.data.orgs().flatMap(o => o.environments).flatMap(e => e.users).filter(u => u.isEnabled && u.onboardedAt).length);
  healthyPct   = computed(() => Math.round(this.healthyUsers() / Math.max(this.totalUsers(), 1) * 100));
  envCount     = computed(() => this.data.orgs().flatMap(o => o.environments).length);
  orgCount     = computed(() => this.data.orgs().length);
  dlqDead      = computed(() => this.data.dlqItems().filter(d => d.status === 'Dead').length);

  orgHealthList = computed(() =>
    this.data.orgs().flatMap(o =>
      o.environments.map(e => {
        const issues = [
          !e.sfConfig?.isVerified && 'Salesforce',
          !e.exchangeConfig?.isVerified && 'Exchange',
        ].filter(Boolean) as string[];
        return {
          name: `${o.name} / ${e.name}`,
          status: issues.length === 0 ? 'Healthy' : issues.length <= 1 ? 'Warning' : 'Error',
          issues,
        };
      })
    )
  );

  healthyEnvs = computed(() => this.orgHealthList().filter(h => h.status === 'Healthy'));

  platforms = computed(() => {
    const t = this.totalUsers();
    return [
      { label: 'Exchange Online', users: t, pct: 100, color: 'var(--accent)' },
    ];
  });

  actionColor(action: string): string {
    if (action.includes('Failed') || action.includes('Expired')) return 'var(--red)';
    if (action.includes('Completed') || action.includes('Refreshed') || action.includes('Onboarded')) return 'var(--green)';
    return 'var(--accent)';
  }
}
