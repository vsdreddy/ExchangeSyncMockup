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
  Environment, SyncUser, ObjectMapping, FieldMapping, OBJECT_TYPES, PLATFORMS, OBJECT_META, DIRECTION_OPTIONS
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
  imports: [CommonModule, FormsModule, BadgeComponent, DirectionBadgeComponent, MatCardModule, MatButtonModule, MatDialogModule],
  template: `
    <div class="grid-2 mb-4">
      <div class="card-sm card-sm--center">
        <div class="text-xs text-muted">Users</div>
        <div class="stat-link" (click)="editTab.emit(2)">{{ env.users.length }}</div>
        <div class="text-xs text-muted">{{ healthyCount }} healthy · {{ env.users.length - healthyCount }} pending</div>
      </div>
      <div class="card-sm card-sm--center">
        <div class="text-xs text-muted">Active Mappings</div>
        <div class="stat-link" (click)="editTab.emit(1)">{{ totalFieldMappings }}</div>
        <div class="text-xs text-muted">across {{ enabledObjects }} enabled objects</div>
      </div>
    </div>

    <div class="section-label">Platform Connection Status</div>
    <div class="sync-bridge">
      <div class="sync-card" [class.sync-card--ok]="env.sfConfig?.isVerified" [class.sync-card--warn]="env.sfConfig && !env.sfConfig.isVerified">
        <button class="sync-edit-btn" title="Edit Salesforce config" (click)="openSfEdit()">✎</button>
        <div class="sync-card-icon">☁</div>
        <div class="sync-card-name">Salesforce</div>
        <app-badge [status]="!env.sfConfig ? 'NotConfigured' : env.sfConfig.isVerified ? 'Verified' : 'Pending'"/>
        @if (env.sfConfig) {
          <div class="text-xs text-muted sf-detail">{{ env.sfConfig.instanceUrl }}</div>
          <div class="text-xs text-muted sf-detail">{{ env.sfConfig.authFlow }} · {{ env.sfConfig.apiVersion }}</div>
        } @else {
          <div class="text-xs text-muted mt-1">Not configured</div>
        }
      </div>

      <div class="sync-arrow">
        <div class="sync-arrow-line"></div>
        <div class="sync-arrow-icon">⇄</div>
        <div class="sync-arrow-line"></div>
        <div class="text-xs text-muted" style="margin-top:6px;text-align:center">Bidirectional sync</div>
      </div>

      <div class="sync-card" [class.sync-card--ok]="env.exchangeConfig?.isVerified" [class.sync-card--warn]="env.exchangeConfig && !env.exchangeConfig.isVerified">
        <button class="sync-edit-btn" title="Edit Exchange config" (click)="openExEdit()">✎</button>
        <div class="sync-card-icon">✉</div>
        <div class="sync-card-name">Exchange Online</div>
        <app-badge [status]="!env.exchangeConfig ? 'NotConfigured' : env.exchangeConfig.isVerified ? 'Verified' : 'Pending'"/>
        @if (env.exchangeConfig) {
          <div class="text-xs text-muted sf-detail">Tenant: {{ env.exchangeConfig.tenantId }}</div>
          <div class="text-xs text-muted sf-detail">{{ env.exchangeConfig.scopes.length }} scopes · renewal {{ env.exchangeConfig.subscriptionRenewalDays }}d</div>
        } @else {
          <div class="text-xs text-muted mt-1">Not configured</div>
        }
      </div>
    </div>

    <div class="divider"></div>
    <div class="section-label">Mapping Summary</div>
    <mat-card>
      <mat-card-content style="padding:0">
        <table class="table">
          <thead><tr><th>Object</th><th>Exchange Direction</th></tr></thead>
          <tbody>
            @for (obj of objectTypes; track obj) {
              <tr>
                <td>{{ objectMeta[obj].icon }} {{ objectMeta[obj].label }}</td>
                <td><app-direction-badge [value]="getMappingDir(obj, 'ExchangeOnline')"/></td>
              </tr>
            }
          </tbody>
        </table>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card { padding: 0 !important; }
    mat-card-content { padding: 0 !important; margin: 0 !important; }
    .card-sm--center { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
    .stat-link { font-weight: 600; font-size: 22px; cursor: pointer; color: var(--accent); text-decoration: none; }
    .stat-link:hover { opacity: .75; }
    .sync-bridge { display: flex; align-items: center; gap: 0; margin-bottom: 8px; }
    .sync-card {
      flex: 1; border: 1px solid var(--border); border-radius: 8px;
      padding: 16px 20px; display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 6px; background: var(--surface);
    }
    .sync-card--ok   { border-color: var(--green); background: rgba(74,222,128,.05); }
    .sync-card--warn { border-color: var(--amber); background: rgba(251,191,36,.05); }
    .sync-card-icon  { font-size: 28px; line-height: 1; }
    .sync-card-name  { font-weight: 600; font-size: 14px; }
    .sf-detail { font-family: var(--font-mono, monospace); font-size: 11px; word-break: break-all; }
    .sync-arrow {
      display: flex; flex-direction: column; align-items: center;
      padding: 0 12px; flex-shrink: 0;
    }
    .sync-arrow-icon { font-size: 22px; color: var(--accent); font-weight: 700; line-height: 1; }
    .sync-arrow-line { width: 1px; height: 20px; background: var(--border); }
    .sync-edit-btn {
      position: absolute; top: 8px; right: 8px;
      background: none; border: none; cursor: pointer;
      font-size: 15px; color: var(--text-3); padding: 2px 4px; border-radius: 4px; line-height: 1;
    }
    .sync-edit-btn:hover { background: rgba(255,255,255,.08); color: var(--accent); }
    .sync-card { position: relative; }
  `],
})
export class OverviewTabComponent {
  @Input()  env!: Environment;
  @Output() editTab = new EventEmitter<number>();
  @Output() sfSaved = new EventEmitter<any>();
  @Output() exSaved = new EventEmitter<any>();

  dialog      = inject(MatDialog);
  objectTypes = OBJECT_TYPES;
  objectMeta  = OBJECT_META;
  blankSf     = { instanceUrl: '', consumerKey: '', authFlow: 'JwtBearer', sandboxName: '', apiVersion: 'v59.0', isVerified: false };
  blankEx     = { tenantId: '', clientId: '', scopes: [], subscriptionRenewalDays: 2, isVerified: false };

  get healthyCount()      { return this.env.users.filter(u => u.isEnabled && u.onboardedAt).length; }
  get totalFieldMappings(){ return Object.values(this.env.mappings).reduce((s, m) => s + m.fieldMappings.length, 0); }
  get enabledObjects()    { return Object.values(this.env.mappings).filter(m => m.isEnabled).length; }

  getMappingDir(obj: string, plat: string): string {
    return this.env.mappings[`${obj}__${plat}`]?.defaultSyncDirection ?? '';
  }

  openSfEdit(): void {
    const ref = this.dialog.open(SalesforceEditDialogComponent, {
      data: { cfg: this.env.sfConfig ?? { ...this.blankSf } },
    });
    ref.afterClosed().subscribe(result => { if (result) this.sfSaved.emit(result); });
  }

  openExEdit(): void {
    const ref = this.dialog.open(ExchangeEditDialogComponent, {
      data: { cfg: this.env.exchangeConfig ?? { ...this.blankEx } },
    });
    ref.afterClosed().subscribe(result => { if (result) this.exSaved.emit(result); });
  }
}

// ── Salesforce Edit Dialog ─────────────────────────────────────────────────────
@Component({
  selector: 'app-sf-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatRadioModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Edit Salesforce Configuration</h2>
    <mat-dialog-content>
      <div class="conn-banner" [class]="cfg.isVerified ? 'ok' : 'warn'">
        <span style="font-weight:700;font-size:15px">{{ cfg.isVerified ? '✓' : '⚠' }}</span>
        <span>{{ cfg.isVerified ? 'Connection verified' : 'Not yet verified' }}</span>
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
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancel</button>
      <button mat-stroked-button (click)="cfg.isVerified = !cfg.isVerified">Test Connection</button>
      <button mat-raised-button color="primary" (click)="cfg.isVerified = true; dialogRef.close(cfg)">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 560px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field-row mat-form-field { width: 100%; }
    .radio-group-vert { display: flex; flex-direction: column; gap: 8px; }
  `],
})
export class SalesforceEditDialogComponent {
  dialogRef = inject(MatDialogRef<SalesforceEditDialogComponent>);
  data: { cfg: any } = inject(MAT_DIALOG_DATA);
  cfg: any;
  authOpts = [
    { v: 'JwtBearer', l: 'JWT Bearer (Service Account) — recommended' },
    { v: 'OAuthAuthorizationCode', l: 'OAuth Authorization Code' },
  ];
  constructor() { this.cfg = JSON.parse(JSON.stringify(this.data.cfg)); }
}

// ── Exchange Edit Dialog ───────────────────────────────────────────────────────
@Component({
  selector: 'app-ex-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Edit Exchange Online Configuration</h2>
    <mat-dialog-content>
      <div class="conn-banner" [class]="cfg.isVerified ? 'ok' : 'warn'">
        <span style="font-weight:700;font-size:15px">{{ cfg.isVerified ? '✓' : '⚠' }}</span>
        <span>{{ cfg.isVerified ? 'Connection verified' : 'Not yet verified' }}</span>
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
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancel</button>
      <button mat-stroked-button (click)="cfg.isVerified = !cfg.isVerified">Test Connection</button>
      <button mat-raised-button color="primary" (click)="cfg.isVerified = true; dialogRef.close(cfg)">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 560px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field-row mat-form-field { width: 100%; }
    .grid-2 { display: flex; flex-direction: column; gap: 8px; }
  `],
})
export class ExchangeEditDialogComponent {
  dialogRef = inject(MatDialogRef<ExchangeEditDialogComponent>);
  data: { cfg: any } = inject(MAT_DIALOG_DATA);
  cfg: any;
  allScopes = ['Calendars.ReadWrite','Contacts.ReadWrite','Tasks.ReadWrite','Mail.Read','MailboxSettings.Read','People.Read'];
  constructor() { this.cfg = JSON.parse(JSON.stringify(this.data.cfg)); }
  toggleScope(s: string): void {
    const i = this.cfg.scopes.indexOf(s);
    i >= 0 ? this.cfg.scopes.splice(i, 1) : this.cfg.scopes.push(s);
  }
}

// ── Mappings Tab ──────────────────────────────────────────────────────────────
@Component({
  selector: 'tab-mappings',
  standalone: true,
  imports: [CommonModule, FormsModule, ToggleComponent, MatButtonModule, MatCardModule, MatSelectModule, MatDialogModule],
  template: `
    <div class="callout info mb-4">
      Environment-wide defaults. Individual users can override per object on the Users tab.
    </div>
    <div class="d-flex justify-between align-center mb-3">
      <span></span>
      <button mat-raised-button color="primary" style="font-size:12px;line-height:32px;padding:0 12px"
        (click)="openAddRow()">+ New Field</button>
    </div>
    <mat-card>
      <mat-card-content style="padding:0">
        <table class="table tree-table">
          <thead>
            <tr>
              <th style="width:36px"></th>
              <th>Object / SF Field</th>
              <th>Direction / Transform</th>
              <th>Conflict / Target Field</th>
              <th style="width:90px;text-align:center">Enabled / Req</th>
              <th style="width:72px"></th>
            </tr>
          </thead>
          <tbody>
            @if (addingRow) {
              <tr class="child-row row-adding">
                <td></td>
                <td>
                  <select class="dir-select" [(ngModel)]="addingRow.obj">
                    @for (o of objectTypes; track o) { <option [value]="o">{{ objectMeta[o].icon }} {{ objectMeta[o].label }}</option> }
                  </select>
                </td>
                <td>
                  <select class="dir-select" [(ngModel)]="addingRow.transform">
                    @for (t of transforms; track t) { <option [value]="t">{{ t }}</option> }
                  </select>
                </td>
                <td><input class="inline-input font-mono" [(ngModel)]="addingRow.targetField" placeholder="target.field"/></td>
                <td style="text-align:center"><input type="checkbox" [(ngModel)]="addingRow.required"/></td>
                <td>
                  <div class="action-btns">
                    <button mat-icon-button class="btn-save visible" (click)="commitAdd()" title="Add field">✓</button>
                    <button mat-icon-button class="btn-cancel" (click)="addingRow=null" title="Cancel">✕</button>
                  </div>
                </td>
              </tr>
            }
            @for (obj of objectTypes; track obj) {
              <tr class="parent-row" (click)="toggle(obj)">
                <td class="chevron-cell">
                  <span class="chevron" [class.open]="expanded[obj]">›</span>
                </td>
                <td style="font-weight:600">{{ objectMeta[obj].icon }} {{ objectMeta[obj].label }}
                  <span class="field-count">({{ getM(obj).fieldMappings.length }} fields)</span>
                </td>
                <td (click)="$event.stopPropagation()">
                  <select class="dir-select" [ngModel]="getM(obj).defaultSyncDirection"
                    (ngModelChange)="patchM(obj,'defaultSyncDirection',$event)">
                    @for (o of dirOpts; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                  </select>
                </td>
                <td (click)="$event.stopPropagation()">
                  <select class="dir-select" [ngModel]="getM(obj).conflictPolicy"
                    (ngModelChange)="patchM(obj,'conflictPolicy',$event)">
                    <option value="SalesforceWins">SF Wins</option>
                    <option value="PlatformWins">Platform Wins</option>
                    <option value="MostRecentWins">Most Recent</option>
                  </select>
                </td>
                <td style="text-align:center" (click)="$event.stopPropagation()">
                  <app-toggle [on]="getM(obj).isEnabled" (changed)="patchM(obj,'isEnabled',$event)"/>
                </td>
                <td></td>
              </tr>
              @if (expanded[obj]) {
                @for (f of getM(obj).fieldMappings; track f.id) {
                  <tr class="child-row" [class.row-editing]="isEditing(obj, f.id)">
                    <td></td>
                    @if (isEditing(obj, f.id)) {
                      <td><input class="inline-input font-mono" style="padding-left:20px" [(ngModel)]="draft!.sfField" (ngModelChange)="isDirty=true"/></td>
                      <td>
                        <select class="dir-select" [(ngModel)]="draft!.transform" (ngModelChange)="isDirty=true">
                          @for (t of transforms; track t) { <option [value]="t">{{ t }}</option> }
                        </select>
                      </td>
                      <td><input class="inline-input font-mono" [(ngModel)]="draft!.targetField" (ngModelChange)="isDirty=true"/></td>
                      <td style="text-align:center">
                        <input type="checkbox" [(ngModel)]="draft!.required" (ngModelChange)="isDirty=true"/>
                      </td>
                      <td>
                        <div class="action-btns">
                          <button mat-icon-button class="btn-save" [class.visible]="isDirty"
                            (click)="saveField(obj)" title="Save">✓</button>
                          <button mat-icon-button class="btn-cancel"
                            (click)="cancelEdit()" title="Cancel">✕</button>
                        </div>
                      </td>
                    } @else {
                      <td><span class="font-mono child-field">{{ f.sfField }}</span></td>
                      <td><span class="text-muted text-sm">{{ f.transform }}</span></td>
                      <td><span class="font-mono text-sm">{{ f.targetField }}</span></td>
                      <td style="text-align:center">
                        @if (f.required) { <span class="badge badge-amber" style="font-size:10px;padding:1px 6px">Req</span> }
                      </td>
                      <td>
                        <div class="action-btns">
                          <button mat-icon-button class="btn-edit"
                            (click)="startEdit(obj, f)" title="Edit">✎</button>
                          <button mat-icon-button class="btn-delete"
                            (click)="deleteField(obj, f.id)" title="Delete">🗑</button>
                        </div>
                      </td>
                    }
                  </tr>
                }
              }
            }
          </tbody>
        </table>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card { padding: 0 !important; }
    mat-card-content { padding: 0 !important; margin: 0 !important; }
    .parent-row { cursor: pointer; background: var(--surface-2, #f5f6f7); }
    .parent-row:hover { background: var(--hover, #ebebec) !important; }
    .child-row td { padding-top: 5px !important; padding-bottom: 5px !important; border-bottom: 1px solid var(--border); }
    .row-editing { background: var(--accent-subtle, #f0f4ff) !important; }
    .row-adding { background: #f0fff4 !important; }
    .child-field { padding-left: 20px; }
    .chevron-cell { text-align: center; }
    .chevron { display: inline-block; font-size: 18px; color: var(--text-muted); transition: transform 0.15s; }
    .chevron.open { transform: rotate(90deg); }
    .field-count { font-size: 11px; font-weight: 400; color: var(--text-muted); margin-left: 6px; }
    .inline-input { width: 100%; padding: 3px 6px; border: 1px solid var(--accent, #5b8ef0); border-radius: 3px; font-size: 12px; font-family: var(--font); background: white; }
    .action-btns { display: flex; gap: 2px; align-items: center; }
    .btn-edit { font-size: 14px; width: 28px; height: 28px; line-height: 28px; color: var(--accent); }
    .btn-delete { font-size: 13px; width: 28px; height: 28px; line-height: 28px; color: var(--red, #d32f2f); }
    .btn-save { font-size: 16px; width: 28px; height: 28px; line-height: 28px; color: var(--green, #2e7d32); opacity: 0; pointer-events: none; transition: opacity 0.15s; }
    .btn-save.visible { opacity: 1; pointer-events: auto; }
    .btn-cancel { font-size: 13px; width: 28px; height: 28px; line-height: 28px; color: var(--text-muted); }
  `],
})
export class MappingsTabComponent {
  @Input() env!: Environment;
  @Output() envChange = new EventEmitter<Environment>();

  objectTypes = OBJECT_TYPES;
  objectMeta  = OBJECT_META;
  dirOpts     = DIRECTION_OPTIONS;
  transforms  = ['Direct', 'Concatenate', 'Lookup', 'DateFormat', 'Custom'];
  dialog      = inject(MatDialog);

  expanded:   Record<string, boolean> = {};
  editingKey: string | null = null;
  draft:      FieldMapping | null = null;
  isDirty     = false;
  addingRow:  { obj: string; sfField: string; transform: string; targetField: string; required: boolean } | null = null;

  toggle(obj: string): void { this.expanded[obj] = !this.expanded[obj]; }

  isEditing(obj: string, fieldId: string): boolean {
    return this.editingKey === `${obj}__${fieldId}`;
  }

  startEdit(obj: string, f: FieldMapping): void {
    this.addingRow = null;
    this.editingKey = `${obj}__${f.id}`;
    this.draft = { ...f };
    this.isDirty = false;
  }

  cancelEdit(): void {
    this.editingKey = null;
    this.draft = null;
    this.isDirty = false;
  }

  saveField(obj: string): void {
    if (!this.draft || !this.isDirty) return;
    const k = `${obj}__${PLATFORMS[0]}`;
    const mapping = this.env.mappings[k];
    const updatedFields = mapping.fieldMappings.map(f => f.id === this.draft!.id ? { ...this.draft! } : f);
    const updated = { ...this.env, mappings: { ...this.env.mappings, [k]: { ...mapping, fieldMappings: updatedFields } } };
    this.envChange.emit(updated);
    this.editingKey = null;
    this.draft = null;
    this.isDirty = false;
  }

  openAddRow(): void {
    this.cancelEdit();
    this.addingRow = { obj: OBJECT_TYPES[0], sfField: '', transform: 'Direct', targetField: '', required: false };
  }

  commitAdd(): void {
    if (!this.addingRow) return;
    const { obj, ...field } = this.addingRow;
    const k = `${obj}__${PLATFORMS[0]}`;
    const mapping = this.env.mappings[k];
    const newField: FieldMapping = { id: `f-${Date.now()}`, ...field } as FieldMapping;
    const updated = { ...this.env, mappings: { ...this.env.mappings, [k]: { ...mapping, fieldMappings: [...mapping.fieldMappings, newField] } } };
    this.envChange.emit(updated);
    this.expanded[obj] = true;
    this.addingRow = null;
  }

  deleteField(obj: string, fieldId: string): void {
    const k = `${obj}__${PLATFORMS[0]}`;
    const mapping = this.env.mappings[k];
    const updatedFields = mapping.fieldMappings.filter(f => f.id !== fieldId);
    const updated = { ...this.env, mappings: { ...this.env.mappings, [k]: { ...mapping, fieldMappings: updatedFields } } };
    this.envChange.emit(updated);
  }

  getM(obj: string): ObjectMapping {
    return this.env.mappings[`${obj}__${PLATFORMS[0]}`];
  }

  patchM(obj: string, key: string, value: any): void {
    const k = `${obj}__${PLATFORMS[0]}`;
    const updated = { ...this.env, mappings: { ...this.env.mappings, [k]: { ...this.env.mappings[k], [key]: value } } };
    this.envChange.emit(updated);
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
    MappingsTabComponent, UsersTabComponent,
  ],
  template: `
    @if (env()) {
      <mat-toolbar class="topbar">
        <button mat-button (click)="router.navigate(['/config'])">← Applications</button>
        <div class="breadcrumb">
          <span class="bc-link" (click)="router.navigate(['/config'])">Applications</span>
          <span class="bc-sep">/</span>
          <span class="bc-current">{{ org()!.name }}</span>
        </div>
        <div class="d-flex gap-2 ml-auto">
          <span class="font-mono text-muted text-xs">{{ org()!.salesforceInstanceUrl }}</span>
          <app-badge [status]="org()!.status"/>
        </div>
      </mat-toolbar>

      <mat-tab-group class="env-tabs" animationDuration="0ms" [selectedIndex]="selectedTab()" (selectedIndexChange)="selectedTab.set($event)">
        <mat-tab label="Overview">
          <div class="content-scroll">
            <tab-overview [env]="env()!" (editTab)="selectedTab.set($event)" (sfSaved)="saveSfCfg($event)" (exSaved)="saveExCfg($event)"/>
          </div>
        </mat-tab>
        <mat-tab [label]="'Mappings (' + totalFieldCount() + ')'">
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

  selectedTab = signal(0);

  orgId  = '';
  envId  = '';

  org = computed(() => this.data.orgs().find(o => o.orgId === this.orgId));
  env = computed(() => this.org()?.environments.find(e => e.envId === this.envId));

  totalFieldCount = computed(() => {
    const m = this.env()?.mappings;
    return m ? Object.values(m).reduce((sum, om) => sum + om.fieldMappings.length, 0) : 0;
  });

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

}
