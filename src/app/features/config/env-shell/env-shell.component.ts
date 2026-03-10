import { Component, computed, inject, signal, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '../../../core/services/data.service';
import { BadgeComponent, DirectionBadgeComponent, PlatformBadgeComponent } from '../../../shared/components/badge.component';
import { ToggleComponent } from '../../../shared/components/toggle.component';
import {
  Environment, SyncUser, ObjectMapping, OBJECT_TYPES, PLATFORMS, OBJECT_META, DIRECTION_OPTIONS
} from '../../../core/models/models';

// ── Field Mapping Dialog ──────────────────────────────────────────────────────
@Component({
  selector: 'app-field-mapping-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, ToggleComponent],
  template: `
    <h2 mat-dialog-title>Field Mappings — {{ data.mapping.objectType }} → {{ data.mapping.targetPlatform }}</h2>
    <mat-dialog-content>
      <div class="grid-3 mb-4">
        <mat-form-field appearance="outline">
          <mat-label>Sync Direction</mat-label>
          <mat-select [(ngModel)]="mapping.defaultSyncDirection">
            @for (o of dirOpts; track o.value) { <mat-option [value]="o.value">{{ o.label }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Conflict Policy</mat-label>
          <mat-select [(ngModel)]="mapping.conflictPolicy">
            <mat-option value="SalesforceWins">Salesforce Wins</mat-option>
            <mat-option value="PlatformWins">Platform Wins</mat-option>
            <mat-option value="MostRecentWins">Most Recent Wins</mat-option>
          </mat-select>
        </mat-form-field>
        <div class="field">
          <div class="text-xs text-muted mb-2" style="font-weight:500">Enabled</div>
          <div class="d-flex gap-2 align-center mt-2">
            <app-toggle [on]="mapping.isEnabled" (changed)="mapping.isEnabled = $event"/>
            <span class="text-sm text-muted">{{ mapping.isEnabled ? 'Active' : 'Disabled' }}</span>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="d-flex justify-between align-center mb-3">
        <h2>Field Mappings</h2>
        <button mat-stroked-button (click)="addField()">+ Add Row</button>
      </div>
      <table class="table">
        <thead><tr><th>Salesforce Field</th><th>Transform</th><th>Target Field</th><th>Required</th><th></th></tr></thead>
        <tbody>
          @for (f of mapping.fieldMappings; track f.id) {
            <tr>
              <td><input [(ngModel)]="f.sfField" class="table-input"/></td>
              <td><select [(ngModel)]="f.transform" class="dir-select">
                @for (t of transforms; track t) { <option [value]="t">{{ t }}</option> }
              </select></td>
              <td><input [(ngModel)]="f.targetField" class="table-input"/></td>
              <td style="text-align:center"><input type="checkbox" [(ngModel)]="f.required"/></td>
              <td><button mat-icon-button style="color:var(--red)" (click)="removeField(f.id)">✕</button></td>
            </tr>
          }
        </tbody>
      </table>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="dialogRef.close(mapping)">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 700px; max-height: 70vh; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .table-input { width: 100%; padding: 4px 6px; border: 1px solid var(--border-2); border-radius: 2px; font-size: 12px; font-family: var(--font); }
  `],
})
export class FieldMappingDialogComponent {
  dialogRef = inject(MatDialogRef<FieldMappingDialogComponent>);
  data: { mapping: ObjectMapping } = inject(MAT_DIALOG_DATA);
  mapping: ObjectMapping;
  dirOpts    = DIRECTION_OPTIONS;
  transforms = ['Direct','Concatenate','Lookup','DateFormat','Custom'];

  constructor() {
    this.mapping = JSON.parse(JSON.stringify(this.data.mapping));
  }

  addField(): void {
    this.mapping.fieldMappings.push({ id: `f-${Date.now()}`, sfField: '', targetField: '', transform: 'Direct', required: false });
  }

  removeField(id: string): void {
    this.mapping.fieldMappings = this.mapping.fieldMappings.filter(f => f.id !== id);
  }
}

// ── User Form Dialog ──────────────────────────────────────────────────────────
@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, ToggleComponent],
  template: `
    <h2 mat-dialog-title>{{ data.editUser ? 'Edit — ' + (data.editUser.displayName || data.editUser.email) : 'Add User' }}</h2>
    <mat-dialog-content>
      <div class="grid-2">
        <div>
          <div class="form-section-title mb-3">User Details</div>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Email *</mat-label>
            <input matInput [(ngModel)]="form.email" placeholder="user@company.com"/>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Display Name</mat-label>
            <input matInput [(ngModel)]="form.displayName" placeholder="Jane Smith"/>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Salesforce User ID *</mat-label>
            <input matInput [(ngModel)]="form.salesforceUserId" placeholder="0055g000001AAA"/>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Platform</mat-label>
            <mat-select [(ngModel)]="form.assignedPlatform">
              <mat-option value="ExchangeOnline">Exchange Online</mat-option>
              <mat-option value="GoogleWorkspace">Google Workspace</mat-option>
              <mat-option value="Unassigned">Unassigned</mat-option>
            </mat-select>
          </mat-form-field>
          <div class="d-flex gap-2 align-center">
            <app-toggle [on]="form.isEnabled" (changed)="form.isEnabled = $event"/>
            <span class="text-sm text-muted">User enabled</span>
          </div>
        </div>
        <div>
          <div class="form-section-title mb-3">Object Sync Overrides</div>
          <div class="callout info text-xs mb-3">
            Default = inherit environment setting. Override to customise for this user.
          </div>
          <div class="sync-grid">
            <div class="sync-grid-head"><span>Object</span><span>Direction</span><span>Override</span></div>
            @for (obj of objectTypes; track obj) {
              <div class="sync-grid-row">
                <span style="font-size:13px">{{ objectMeta[obj].icon }} {{ objectMeta[obj].label }}</span>
                <select class="dir-select" [ngModel]="form.objectSyncs[obj] ?? '__inherit__'"
                  (ngModelChange)="setSync(obj, $event)">
                  <option value="__inherit__">↩ Default ({{ envDefault(obj) }})</option>
                  @for (o of dirOpts; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                </select>
                <span [class]="form.objectSyncs[obj] ? 'override-chip' : 'default-chip'">
                  {{ form.objectSyncs[obj] ? 'Custom' : 'Default' }}
                </span>
              </div>
            }
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="dialogRef.close(form)">
        {{ data.editUser ? 'Save Changes' : 'Add User' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 760px; max-height: 80vh; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
  `],
})
export class UserFormDialogComponent {
  dialogRef = inject(MatDialogRef<UserFormDialogComponent>);
  data: { editUser: SyncUser | null; form: any; env: Environment } = inject(MAT_DIALOG_DATA);
  form: any;
  objectTypes = OBJECT_TYPES;
  objectMeta  = OBJECT_META;
  dirOpts     = DIRECTION_OPTIONS;

  constructor() {
    this.form = { ...this.data.form, objectSyncs: { ...this.data.form.objectSyncs } };
  }

  envDefault(obj: string): string {
    return this.data.env.mappings[`${obj}__${this.form.assignedPlatform}`]?.defaultSyncDirection ?? 'Bidirectional';
  }

  setSync(obj: string, val: string): void {
    this.form.objectSyncs[obj] = val === '__inherit__' ? null : val;
  }
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
@Component({
  selector: 'tab-overview',
  standalone: true,
  imports: [CommonModule, BadgeComponent, DirectionBadgeComponent, MatCardModule],
  template: `
    <div class="grid-3 mb-4">
      <div class="card-sm">
        <div class="text-xs text-muted mb-2">Environment</div>
        <div style="font-weight:600">{{ env.name }}</div>
        <div class="d-flex gap-2 mt-2"><app-badge [status]="env.type"/></div>
      </div>
      <div class="card-sm">
        <div class="text-xs text-muted mb-2">Users</div>
        <div style="font-weight:600;font-size:22px">{{ env.users.length }}</div>
        <div class="text-xs text-muted">{{ healthyCount }} healthy · {{ env.users.length - healthyCount }} pending</div>
      </div>
      <div class="card-sm">
        <div class="text-xs text-muted mb-2">Active Mappings</div>
        <div style="font-weight:600;font-size:22px">{{ activeMappings }}</div>
        <div class="text-xs text-muted">of {{ totalMappings }} total</div>
      </div>
    </div>

    <div class="section-label">Platform Connection Status</div>
    @for (p of platforms; track p.label) {
      <div class="status-row">
        <div class="d-flex gap-3 align-center">
          <span style="font-size:16px;width:20px;text-align:center">{{ p.icon }}</span>
          <div>
            <div style="font-weight:500;font-size:13px">{{ p.label }}</div>
            <div class="text-xs text-muted">
              {{ !p.cfg ? 'Not configured' : p.cfg.isVerified ? 'Connection verified' : 'Configured — pending verification' }}
            </div>
          </div>
        </div>
        <app-badge [status]="!p.cfg ? 'NotConfigured' : p.cfg.isVerified ? 'Verified' : 'Pending'"/>
      </div>
    }

    <div class="divider"></div>
    <div class="section-label">Mapping Summary</div>
    <mat-card>
      <mat-card-content style="padding:0">
        <table class="table">
          <thead><tr><th>Object</th><th>Exchange Direction</th><th>Google Direction</th></tr></thead>
          <tbody>
            @for (obj of objectTypes; track obj) {
              <tr>
                <td>{{ objectMeta[obj].icon }} {{ objectMeta[obj].label }}</td>
                <td><app-direction-badge [value]="getMappingDir(obj, 'ExchangeOnline')"/></td>
                <td><app-direction-badge [value]="getMappingDir(obj, 'GoogleWorkspace')"/></td>
              </tr>
            }
          </tbody>
        </table>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`mat-card { padding: 0 !important; } mat-card-content { padding: 0 !important; margin: 0 !important; }`],
})
export class OverviewTabComponent {
  @Input() env!: Environment;

  objectTypes = OBJECT_TYPES;
  objectMeta  = OBJECT_META;

  get healthyCount()   { return this.env.users.filter(u => u.isEnabled && u.onboardedAt).length; }
  get activeMappings() { return Object.values(this.env.mappings).filter(m => m.isEnabled).length; }
  get totalMappings()  { return Object.keys(this.env.mappings).length; }

  get platforms() {
    return [
      { icon: '☁', label: 'Salesforce',       cfg: this.env.sfConfig },
      { icon: '✉', label: 'Exchange Online',  cfg: this.env.exchangeConfig },
      { icon: 'G', label: 'Google Workspace', cfg: this.env.googleConfig },
    ];
  }

  getMappingDir(obj: string, plat: string): string {
    return this.env.mappings[`${obj}__${plat}`]?.defaultSyncDirection ?? '';
  }
}

// ── Salesforce Tab ─────────────────────────────────────────────────────────────
@Component({
  selector: 'tab-salesforce',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatRadioModule],
  template: `
    <div class="conn-banner" [class]="cfg.isVerified ? 'ok' : 'warn'">
      <span style="font-weight:700;font-size:15px">{{ cfg.isVerified ? '✓' : '⚠' }}</span>
      <span>Salesforce — {{ cfg.isVerified ? 'connection verified' : 'not yet verified' }}</span>
      @if (cfg.isVerified) { <span class="ml-auto text-xs" style="opacity:.7">Tested 1 hour ago</span> }
    </div>
    <div class="form-section">
      <div class="form-section-title">Connected App Credentials</div>
      <div class="field-row">
        <mat-form-field appearance="outline">
          <mat-label>Salesforce Instance URL *</mat-label>
          <input matInput [(ngModel)]="cfg.instanceUrl" placeholder="https://yourorg.my.salesforce.com"/>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Consumer Key *</mat-label>
          <input matInput [(ngModel)]="cfg.consumerKey" placeholder="3MVG9pRiRo..."/>
        </mat-form-field>
      </div>
      <div class="field-row">
        <mat-form-field appearance="outline">
          <mat-label>Sandbox Name</mat-label>
          <input matInput [(ngModel)]="cfg.sandboxName" placeholder="Leave blank for production"/>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>API Version</mat-label>
          <mat-select [(ngModel)]="cfg.apiVersion">
            @for (v of ['v59.0','v58.0','v57.0']; track v) { <mat-option [value]="v">{{ v }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">Authentication Method</div>
      <mat-radio-group [(ngModel)]="cfg.authFlow" class="radio-group-vert">
        @for (opt of authOpts; track opt.v) {
          <mat-radio-button [value]="opt.v">{{ opt.l }}</mat-radio-button>
        }
      </mat-radio-group>
    </div>
    <div class="d-flex gap-2 mt-4 justify-end">
      <button mat-stroked-button (click)="cfg.isVerified = !cfg.isVerified">Test Connection</button>
      <button mat-raised-button color="primary" (click)="cfg.isVerified = true; saved.emit(cfg)">Save Salesforce Config</button>
    </div>
  `,
  styles: [`
    .field-row mat-form-field { width: 100%; }
    .radio-group-vert { display: flex; flex-direction: column; gap: 8px; }
  `],
})
export class SalesforceTabComponent {
  @Input() cfg: any = {};
  @Output() saved = new EventEmitter();
  authOpts = [
    { v: 'JwtBearer', l: 'JWT Bearer (Service Account) — recommended' },
    { v: 'OAuthAuthorizationCode', l: 'OAuth Authorization Code' },
  ];
}

// ── Exchange Tab ──────────────────────────────────────────────────────────────
@Component({
  selector: 'tab-exchange',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCheckboxModule],
  template: `
    <div class="conn-banner" [class]="cfg.isVerified ? 'ok' : 'warn'">
      <span style="font-weight:700;font-size:15px">{{ cfg.isVerified ? '✓' : '⚠' }}</span>
      <span>Exchange Online — {{ cfg.isVerified ? 'connection verified' : 'not yet verified' }}</span>
    </div>
    <div class="form-section">
      <div class="form-section-title">Azure AD App Registration</div>
      <div class="field-row">
        <mat-form-field appearance="outline">
          <mat-label>Tenant ID *</mat-label>
          <input matInput [(ngModel)]="cfg.tenantId" placeholder="550e8400-e29b-..."/>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Client ID *</mat-label>
          <input matInput [(ngModel)]="cfg.clientId" placeholder="7c9e6679-..."/>
        </mat-form-field>
      </div>
      <div class="card-sm d-flex justify-between align-center mt-2">
        <div><div style="font-weight:500;font-size:13px">Client Secret</div><div class="text-xs text-muted">Stored in AWS Secrets Manager</div></div>
        <button mat-stroked-button>Rotate Secret</button>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">Delegated OAuth Scopes</div>
      <div class="grid-2">
        @for (s of allScopes; track s) {
          <mat-checkbox [checked]="cfg.scopes.includes(s)" (change)="toggleScope(s)">
            <span class="font-mono">{{ s }}</span>
          </mat-checkbox>
        }
      </div>
    </div>
    <mat-form-field appearance="outline" style="max-width:240px">
      <mat-label>Subscription Renewal Lead (days)</mat-label>
      <input matInput type="number" [(ngModel)]="cfg.subscriptionRenewalDays" min="1" max="3"/>
    </mat-form-field>
    <div class="d-flex gap-2 mt-4 justify-end">
      <button mat-stroked-button (click)="cfg.isVerified = !cfg.isVerified">Test Connection</button>
      <button mat-raised-button color="primary" (click)="cfg.isVerified = true; saved.emit(cfg)">Save Exchange Config</button>
    </div>
  `,
  styles: [`.field-row mat-form-field { width: 100%; } .grid-2 { display: flex; flex-direction: column; gap: 8px; }`],
})
export class ExchangeTabComponent {
  @Input() cfg: any = { scopes: [] };
  @Output() saved = new EventEmitter();
  allScopes = ['Calendars.ReadWrite','Contacts.ReadWrite','Tasks.ReadWrite','Mail.Read','MailboxSettings.Read','People.Read'];
  toggleScope(s: string): void {
    const i = this.cfg.scopes.indexOf(s);
    i >= 0 ? this.cfg.scopes.splice(i, 1) : this.cfg.scopes.push(s);
  }
}

// ── Google Tab ────────────────────────────────────────────────────────────────
@Component({
  selector: 'tab-google',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCheckboxModule],
  template: `
    <div class="conn-banner" [class]="cfg.isVerified ? 'ok' : 'warn'">
      <span style="font-weight:700;font-size:15px">{{ cfg.isVerified ? '✓' : '⚠' }}</span>
      <span>Google Workspace — {{ cfg.isVerified ? 'connection verified' : 'not yet verified' }}</span>
    </div>
    <div class="form-section">
      <div class="form-section-title">Domain & Service Account</div>
      <div class="field-row">
        <mat-form-field appearance="outline">
          <mat-label>Workspace Domain *</mat-label>
          <input matInput [(ngModel)]="cfg.domain" placeholder="yourcompany.com"/>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Client ID *</mat-label>
          <input matInput [(ngModel)]="cfg.clientId" placeholder="123456-abc.apps.googleusercontent.com"/>
        </mat-form-field>
      </div>
      <div class="field-row">
        <mat-form-field appearance="outline">
          <mat-label>Service Account Email *</mat-label>
          <input matInput [(ngModel)]="cfg.serviceAccountEmail" placeholder="sync@project.iam.gserviceaccount.com"/>
        </mat-form-field>
        <div class="card-sm d-flex justify-between align-center">
          <div><div style="font-weight:500;font-size:13px">Service Account Key (JSON)</div><div class="text-xs text-muted">Stored in Secrets Manager after upload</div></div>
          <button mat-stroked-button>Upload .json</button>
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">API Scopes</div>
      <div class="grid-2">
        @for (s of allScopes; track s) {
          <mat-checkbox [checked]="cfg.scopes.includes(s)" (change)="toggleScope(s)">
            <span class="font-mono">…/auth/{{ s }}</span>
          </mat-checkbox>
        }
      </div>
    </div>
    <mat-form-field appearance="outline" style="max-width:280px">
      <mat-label>Webhook Channel TTL (days, max 7)</mat-label>
      <input matInput type="number" [(ngModel)]="cfg.channelTtlDays" min="1" max="7"/>
    </mat-form-field>
    <div class="d-flex gap-2 mt-4 justify-end">
      <button mat-stroked-button (click)="cfg.isVerified = !cfg.isVerified">Test Connection</button>
      <button mat-raised-button color="primary" (click)="cfg.isVerified = true; saved.emit(cfg)">Save Google Config</button>
    </div>
  `,
  styles: [`.field-row mat-form-field { width: 100%; } .grid-2 { display: flex; flex-direction: column; gap: 8px; }`],
})
export class GoogleTabComponent {
  @Input() cfg: any = { scopes: [] };
  @Output() saved = new EventEmitter();
  allScopes = ['calendar','contacts','tasks','gmail.readonly','admin.directory.user.readonly'];
  toggleScope(s: string): void {
    const i = this.cfg.scopes.indexOf(s);
    i >= 0 ? this.cfg.scopes.splice(i, 1) : this.cfg.scopes.push(s);
  }
}

// ── Mappings Tab ──────────────────────────────────────────────────────────────
@Component({
  selector: 'tab-mappings',
  standalone: true,
  imports: [CommonModule, FormsModule, PlatformBadgeComponent, ToggleComponent, MatButtonModule, MatCardModule, MatSelectModule, MatDialogModule],
  template: `
    <div class="callout info mb-4">
      Environment-wide defaults. Individual users can override per object on the Users tab.
    </div>
    <mat-card>
      <mat-card-content style="padding:0">
        <table class="table">
          <thead><tr><th>Object</th><th>Platform</th><th>Direction</th><th>Conflict</th><th>Enabled</th><th>Fields</th></tr></thead>
          <tbody>
            @for (obj of objectTypes; track obj) {
              @for (plat of platforms; track plat) {
                <tr>
                  <td style="font-weight:500">{{ objectMeta[obj].icon }} {{ objectMeta[obj].label }}</td>
                  <td><app-platform-badge [platform]="plat"/></td>
                  <td>
                    <select class="dir-select" [ngModel]="getM(obj,plat).defaultSyncDirection"
                      (ngModelChange)="patchM(obj,plat,'defaultSyncDirection',$event)">
                      @for (o of dirOpts; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                    </select>
                  </td>
                  <td>
                    <select class="dir-select" [ngModel]="getM(obj,plat).conflictPolicy"
                      (ngModelChange)="patchM(obj,plat,'conflictPolicy',$event)">
                      <option value="SalesforceWins">SF Wins</option>
                      <option value="PlatformWins">Platform Wins</option>
                      <option value="MostRecentWins">Most Recent</option>
                    </select>
                  </td>
                  <td>
                    <app-toggle [on]="getM(obj,plat).isEnabled"
                      (changed)="patchM(obj,plat,'isEnabled',$event)"/>
                  </td>
                  <td>
                    <button mat-stroked-button style="font-size:11px;line-height:28px;padding:0 8px"
                      (click)="openMappingEditor(obj,plat)">
                      Edit ({{ getM(obj,plat).fieldMappings.length }})
                    </button>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`mat-card { padding: 0 !important; } mat-card-content { padding: 0 !important; margin: 0 !important; }`],
})
export class MappingsTabComponent {
  @Input() env!: Environment;
  @Output() envChange = new EventEmitter<Environment>();

  objectTypes = OBJECT_TYPES;
  platforms   = PLATFORMS;
  objectMeta  = OBJECT_META;
  dirOpts     = DIRECTION_OPTIONS;
  dialog      = inject(MatDialog);

  getM(obj: string, plat: string): ObjectMapping {
    return this.env.mappings[`${obj}__${plat}`];
  }

  patchM(obj: string, plat: string, key: string, value: any): void {
    const k = `${obj}__${plat}`;
    const updated = { ...this.env, mappings: { ...this.env.mappings, [k]: { ...this.env.mappings[k], [key]: value } } };
    this.envChange.emit(updated);
  }

  openMappingEditor(obj: string, plat: string): void {
    const key = `${obj}__${plat}`;
    const ref = this.dialog.open(FieldMappingDialogComponent, {
      data: { mapping: this.env.mappings[key] },
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        const updated = { ...this.env, mappings: { ...this.env.mappings, [key]: result } };
        this.envChange.emit(updated);
      }
    });
  }
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'tab-users',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, DirectionBadgeComponent, PlatformBadgeComponent, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatDialogModule],
  template: `
    <div class="d-flex justify-between align-center mb-4">
      <mat-form-field appearance="outline" style="width:240px">
        <mat-label>Search users…</mat-label>
        <input matInput [(ngModel)]="search"/>
      </mat-form-field>
      <div class="d-flex gap-2">
        <button mat-stroked-button>⬆ Bulk Import CSV</button>
        <button mat-raised-button color="primary" (click)="openAdd()">+ Add User</button>
      </div>
    </div>

    @if (filtered().length === 0) {
      <div class="empty-state">
        <span class="empty-icon">👥</span>
        <p>{{ env.users.length === 0 ? 'No users configured yet.' : 'No users match search.' }}</p>
        @if (env.users.length === 0) {
          <button mat-raised-button color="primary" (click)="openAdd()">Add First User</button>
        }
      </div>
    } @else {
      <mat-card>
        <mat-card-content style="padding:0">
          <table class="table">
            <thead><tr><th>User</th><th>SF User ID</th><th>Platform</th><th>Object Overrides</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (u of filtered(); track u.userId) {
                <tr>
                  <td>
                    <div style="font-weight:500">{{ u.displayName || u.email }}</div>
                    @if (u.displayName) { <div class="text-xs text-muted">{{ u.email }}</div> }
                  </td>
                  <td><span class="font-mono">{{ u.salesforceUserId }}</span></td>
                  <td><app-platform-badge [platform]="u.assignedPlatform"/></td>
                  <td>
                    <div class="d-flex gap-1" style="flex-wrap:wrap;gap:4px">
                      @for (obj of objectTypes; track obj) {
                        @if (u.objectSyncs[obj]) {
                          <app-direction-badge [value]="u.objectSyncs[obj]!"/>
                        }
                      }
                      @if (!hasOverrides(u)) {
                        <span class="text-xs text-muted">All defaults</span>
                      }
                    </div>
                  </td>
                  <td>
                    <app-badge [status]="!u.isEnabled ? 'Disabled' : !u.onboardedAt ? 'Pending' : 'Healthy'"/>
                  </td>
                  <td>
                    <div class="d-flex gap-2">
                      <button mat-stroked-button style="font-size:11px;line-height:28px;padding:0 8px" (click)="openEdit(u)">Edit</button>
                      <button mat-icon-button style="color:var(--red);width:28px;height:28px;line-height:28px" (click)="removeUser(u.userId)">✕</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`mat-card { padding: 0 !important; } mat-card-content { padding: 0 !important; margin: 0 !important; }`],
})
export class UsersTabComponent {
  @Input() env!: Environment;
  @Output() envChange = new EventEmitter<Environment>();

  objectTypes = OBJECT_TYPES;
  objectMeta  = OBJECT_META;
  dirOpts     = DIRECTION_OPTIONS;
  dialog      = inject(MatDialog);

  search = '';

  filtered = () =>
    this.env.users.filter(u =>
      (u.email + (u.displayName || '')).toLowerCase().includes(this.search.toLowerCase())
    );

  hasOverrides = (u: SyncUser) => Object.values(u.objectSyncs).some(Boolean);

  openAdd(): void {
    const form = {
      email: '', displayName: '', salesforceUserId: '',
      assignedPlatform: 'ExchangeOnline', isEnabled: true,
      objectSyncs: { CalendarEvent: null, Contact: null, Task: null, EmailActivity: null },
    };
    const ref = this.dialog.open(UserFormDialogComponent, {
      data: { editUser: null, form, env: this.env },
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const users = [...this.env.users, { ...result, userId: `u-${Date.now()}`, onboardedAt: null }];
      this.envChange.emit({ ...this.env, users });
    });
  }

  openEdit(u: SyncUser): void {
    const ref = this.dialog.open(UserFormDialogComponent, {
      data: { editUser: u, form: { ...u, objectSyncs: { ...u.objectSyncs } }, env: this.env },
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const users = this.env.users.map(user => user.userId === u.userId ? { ...user, ...result } : user);
      this.envChange.emit({ ...this.env, users });
    });
  }

  removeUser(id: string): void {
    if (!confirm('Remove user?')) return;
    this.envChange.emit({ ...this.env, users: this.env.users.filter(u => u.userId !== id) });
  }
}

// ── Env Shell (container with tab router) ─────────────────────────────────────
@Component({
  selector: 'app-env-shell',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule, MatButtonModule, MatTabsModule,
    BadgeComponent, OverviewTabComponent,
    SalesforceTabComponent, ExchangeTabComponent, GoogleTabComponent,
    MappingsTabComponent, UsersTabComponent,
  ],
  template: `
    @if (env()) {
      <mat-toolbar class="topbar">
        <button mat-button (click)="router.navigate(['/config', org()!.orgId])">← Back</button>
        <div class="breadcrumb">
          <span class="bc-link" (click)="router.navigate(['/config'])">Applications</span>
          <span class="bc-sep">/</span>
          <span class="bc-link" (click)="router.navigate(['/config', org()!.orgId])">{{ org()!.name }}</span>
          <span class="bc-sep">/</span>
          <span class="bc-current">{{ env()!.name }}</span>
        </div>
        <div class="d-flex gap-2 ml-auto">
          <app-badge [status]="env()!.type"/>
          @if (env()!.isDefault) { <app-badge status="Active"/> }
        </div>
      </mat-toolbar>

      <mat-tab-group class="env-tabs" animationDuration="0ms">
        <mat-tab label="Overview">
          <div class="content-scroll">
            <tab-overview [env]="env()!"/>
          </div>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            Salesforce
            <span class="tab-dot" [style.color]="env()!.sfConfig?.isVerified ? 'var(--green)' : 'var(--border-2)'">
              {{ env()!.sfConfig?.isVerified ? '●' : '○' }}
            </span>
          </ng-template>
          <div class="content-scroll">
            @if (sfCfg()) {
              <tab-salesforce [cfg]="sfCfg()" (saved)="saveSfCfg($event)"/>
            } @else {
              <div class="callout warning mb-3">No Salesforce config yet. Fill in the fields to create one.</div>
              <tab-salesforce [cfg]="blankSf" (saved)="saveSfCfg($event)"/>
            }
          </div>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            Exchange Online
            <span class="tab-dot" [style.color]="env()!.exchangeConfig?.isVerified ? 'var(--green)' : 'var(--border-2)'">
              {{ env()!.exchangeConfig?.isVerified ? '●' : '○' }}
            </span>
          </ng-template>
          <div class="content-scroll">
            @if (exCfg()) {
              <tab-exchange [cfg]="exCfg()" (saved)="saveExCfg($event)"/>
            } @else {
              <div class="callout warning mb-3">No Exchange config yet.</div>
              <tab-exchange [cfg]="blankEx" (saved)="saveExCfg($event)"/>
            }
          </div>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            Google Workspace
            <span class="tab-dot" [style.color]="env()!.googleConfig?.isVerified ? 'var(--green)' : 'var(--border-2)'">
              {{ env()!.googleConfig?.isVerified ? '●' : '○' }}
            </span>
          </ng-template>
          <div class="content-scroll">
            @if (gCfg()) {
              <tab-google [cfg]="gCfg()" (saved)="saveGCfg($event)"/>
            } @else {
              <div class="callout warning mb-3">No Google Workspace config yet.</div>
              <tab-google [cfg]="blankG" (saved)="saveGCfg($event)"/>
            }
          </div>
        </mat-tab>
        <mat-tab label="Mappings">
          <div class="content-scroll">
            <tab-mappings [env]="env()!" (envChange)="updateEnv($event)"/>
          </div>
        </mat-tab>
        <mat-tab [label]="'Users (' + (env()!.users.length) + ')'">
          <div class="content-scroll">
            <tab-users [env]="env()!" (envChange)="updateEnv($event)"/>
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [`
    .topbar { background: var(--surface) !important; border-bottom: 1px solid var(--border); box-shadow: var(--shadow-sm); height: 48px; min-height: 48px; padding: 0 24px; gap: 12px; }
    .env-tabs { flex: 1; display: flex; flex-direction: column; }
    ::ng-deep .env-tabs .mat-mdc-tab-body-wrapper { flex: 1; }
    ::ng-deep .env-tabs .mat-mdc-tab-body-content { height: 100%; }
    .content-scroll { flex: 1; overflow-y: auto; padding: 24px 28px; background: var(--bg); height: 100%; }
    .tab-dot { margin-left: 4px; font-size: 9px; }
  `],
})
export class EnvShellComponent implements OnInit {
  data   = inject(DataService);
  router = inject(Router);
  route  = inject(ActivatedRoute);

  orgId  = '';
  envId  = '';

  org = computed(() => this.data.orgs().find(o => o.orgId === this.orgId));
  env = computed(() => this.org()?.environments.find(e => e.envId === this.envId));

  sfCfg = computed(() => this.env()?.sfConfig ?? null);
  exCfg = computed(() => this.env()?.exchangeConfig ?? null);
  gCfg  = computed(() => this.env()?.googleConfig ?? null);

  blankSf = { instanceUrl: '', consumerKey: '', authFlow: 'JwtBearer', sandboxName: '', apiVersion: 'v59.0', isVerified: false };
  blankEx = { tenantId: '', clientId: '', scopes: [], subscriptionRenewalDays: 2, isVerified: false };
  blankG  = { domain: '', clientId: '', serviceAccountEmail: '', scopes: [], channelTtlDays: 5, isVerified: false };

  ngOnInit(): void {
    this.orgId = this.route.snapshot.paramMap.get('orgId') ?? '';
    this.envId = this.route.snapshot.paramMap.get('envId') ?? '';
  }

  updateEnv(updated: Environment): void {
    this.data.updateEnv(this.orgId, updated);
  }

  saveSfCfg(cfg: any): void {
    const e = this.env();
    if (e) this.updateEnv({ ...e, sfConfig: cfg });
  }

  saveExCfg(cfg: any): void {
    const e = this.env();
    if (e) this.updateEnv({ ...e, exchangeConfig: cfg });
  }

  saveGCfg(cfg: any): void {
    const e = this.env();
    if (e) this.updateEnv({ ...e, googleConfig: cfg });
  }
}
