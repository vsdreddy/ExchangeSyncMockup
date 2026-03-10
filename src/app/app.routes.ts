import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'dlq',
    loadComponent: () =>
      import('./features/dlq/dlq.component').then(m => m.DlqComponent),
  },
  {
    path: 'audit',
    loadComponent: () =>
      import('./features/audit/audit.component').then(m => m.AuditComponent),
  },
  {
    path: 'config',
    loadComponent: () =>
      import('./features/config/org-list/org-list.component').then(m => m.OrgListComponent),
  },
  {
    path: 'config/:orgId',
    loadComponent: () =>
      import('./features/config/org-detail/org-detail.component').then(m => m.OrgDetailComponent),
  },
  {
    path: 'config/:orgId/env/:envId',
    loadComponent: () =>
      import('./features/config/env-shell/env-shell.component').then(m => m.EnvShellComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
