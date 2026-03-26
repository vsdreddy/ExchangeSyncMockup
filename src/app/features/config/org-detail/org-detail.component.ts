import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DataService, buildDefaultMappings } from '../../../core/services/data.service';

// ── Org Detail ────────────────────────────────────────────────────────────────
// Redirect-only component: sends the user straight to the single environment shell.
// If the org has no environment yet, one is auto-created before redirecting.
@Component({
  selector: 'app-org-detail',
  standalone: true,
  imports: [],
  template: ``,
})
export class OrgDetailComponent implements OnInit {
  data   = inject(DataService);
  router = inject(Router);
  route  = inject(ActivatedRoute);

  ngOnInit(): void {
    const orgId = this.route.snapshot.paramMap.get('orgId') ?? '';
    const org   = this.data.orgs().find(o => o.orgId === orgId);
    if (!org) { this.router.navigate(['/config'], { replaceUrl: true }); return; }

    let env = org.environments[0];
    if (!env) {
      const envId = `env-${Date.now()}`;
      env = {
        envId, orgId, name: 'Production', type: 'Production',
        status: 'Active', isDefault: true,
        sfConfig: null, exchangeConfig: null,
        mappings: buildDefaultMappings(), users: [],
      };
      this.data.addEnv(orgId, env);
    }

    this.router.navigate(['/config', orgId, 'env', env.envId], { replaceUrl: true });
  }
}
