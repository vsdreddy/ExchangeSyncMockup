import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatListModule],
  template: `
    <aside class="sidebar">
      <!-- Header -->
      <div class="sidebar-header">
        <div class="sidebar-product">Exchange Sync</div>
        <div class="sidebar-appname">Admin Console</div>
        <div class="sidebar-version">v2.0 · Angular 21 · .NET Core 8</div>
      </div>

      <!-- Operations -->
      <div class="nav-section">
        <div class="nav-section-label">Operations</div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">⊞</span> Dashboard
          </a>
          <a mat-list-item routerLink="/dlq" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">⚠</span> DLQ Manager
          </a>
          <a mat-list-item routerLink="/audit" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">≡</span> Audit Log
          </a>
        </mat-nav-list>
      </div>

      <div class="sidebar-divider"></div>

      <!-- Configuration -->
      <div class="nav-section">
        <div class="nav-section-label">Configuration</div>
        <mat-nav-list>
          <a mat-list-item routerLink="/config" [routerLinkActiveOptions]="{exact:true}" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">⚙</span> Applications
          </a>
        </mat-nav-list>

        @for (org of data.pinnedOrgs(); track org.orgId) {
          <div
            class="pinned-item"
            [class.active]="router.url === '/config/' + org.orgId"
            (click)="router.navigate(['/config', org.orgId])"
          >
            <div class="pinned-dot"
              [style.background]="org.status === 'Active' ? 'var(--green)' : 'var(--amber)'">
            </div>
            <span class="pinned-name" [title]="org.name">{{ org.name }}</span>
            <button class="unpin-btn"
              (click)="$event.stopPropagation(); data.togglePin(org.orgId)"
              title="Unpin">✕</button>
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="sidebar-footer">
        Exchange Sync Service v2.0<br>
        Angular 21 · .NET Core 8<br>
        AWS · DynamoDB
      </div>
    </aside>
  `,
  styles: [`
    :host { display: flex; height: 100%; }
    .sidebar { width: 240px; min-width: 240px; height: 100%; display: flex; flex-direction: column; overflow-y: auto; }
    mat-nav-list { padding: 0 !important; }
    a.nav-item {
      display: flex !important;
      align-items: center;
      gap: 10px;
      padding: 9px 20px !important;
      font-size: 13px;
      color: var(--sidebar-text) !important;
      transition: var(--t);
      border-left: 2px solid transparent;
      text-decoration: none;
      height: auto !important;
      min-height: 0 !important;
      line-height: normal !important;
    }
    a.nav-item:hover { background: rgba(255,255,255,.06) !important; color: #fff !important; border-left-color: rgba(120,169,255,.3); }
    a.nav-item.active { background: rgba(120,169,255,.12) !important; color: var(--sidebar-active-text) !important; border-left-color: var(--sidebar-accent); font-weight: 500; }
    a.nav-item.active .nav-icon { opacity: 1; color: var(--sidebar-accent); }
    ::ng-deep .mdc-list-item__content { padding: 0 !important; }
  `],
})
export class SidebarComponent {
  data   = inject(DataService);
  router = inject(Router);
}
