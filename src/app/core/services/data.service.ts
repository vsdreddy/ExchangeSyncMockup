import { Injectable, signal, computed } from '@angular/core';
import {
  Organisation, Environment, DlqItem, AuditEntry,
  ObjectMapping, SyncDirection, OBJECT_TYPES, PLATFORMS
} from '../models/models';

// ── Seed field mappings ───────────────────────────────────────────────────────
const FIELD_DEFS: Record<string, any[]> = {
  CalendarEvent: [
    { id: 'f1', sfField: 'Subject',       targetField: 'subject',          transform: 'Direct',     required: true },
    { id: 'f2', sfField: 'StartDateTime', targetField: 'start.dateTime',   transform: 'Direct',     required: true },
    { id: 'f3', sfField: 'EndDateTime',   targetField: 'end.dateTime',     transform: 'Direct',     required: true },
    { id: 'f4', sfField: 'Location',      targetField: 'location',         transform: 'Direct',     required: false },
    { id: 'f5', sfField: 'Description',   targetField: 'body.content',     transform: 'Direct',     required: false },
    { id: 'f6', sfField: 'OwnerId',       targetField: 'organizer.email',  transform: 'Lookup',     required: true },
  ],
  Contact: [
    { id: 'c1', sfField: 'FirstName',   targetField: 'givenName',         transform: 'Direct', required: true },
    { id: 'c2', sfField: 'LastName',    targetField: 'surname',           transform: 'Direct', required: true },
    { id: 'c3', sfField: 'Email',       targetField: 'emailAddresses[0]', transform: 'Direct', required: true },
    { id: 'c4', sfField: 'Phone',       targetField: 'businessPhones[0]', transform: 'Direct', required: false },
    { id: 'c5', sfField: 'Title',       targetField: 'jobTitle',          transform: 'Direct', required: false },
    { id: 'c6', sfField: 'AccountName', targetField: 'companyName',       transform: 'Lookup', required: false },
  ],
  Task: [
    { id: 't1', sfField: 'Subject',      targetField: 'title',        transform: 'Direct',     required: true },
    { id: 't2', sfField: 'ActivityDate', targetField: 'dueDateTime',  transform: 'DateFormat', required: false },
    { id: 't3', sfField: 'Description',  targetField: 'body.content', transform: 'Direct',     required: false },
    { id: 't4', sfField: 'Status',       targetField: 'status',       transform: 'Lookup',     required: false },
  ],
  EmailActivity: [
    { id: 'e1', sfField: 'Subject',     targetField: 'subject',           transform: 'Direct', required: true },
    { id: 'e2', sfField: 'FromAddress', targetField: 'from.emailAddress', transform: 'Direct', required: true },
    { id: 'e3', sfField: 'TextBody',    targetField: 'body.content',      transform: 'Direct', required: false },
  ],
};

export function buildDefaultMappings(): { [key: string]: ObjectMapping } {
  const result: { [key: string]: ObjectMapping } = {};
  for (const obj of OBJECT_TYPES) {
    for (const plat of PLATFORMS) {
      const key = `${obj}__${plat}`;
      result[key] = {
        objectType: obj,
        targetPlatform: plat as any,
        defaultSyncDirection: obj === 'EmailActivity' ? 'PlatformToSalesforce' : 'Bidirectional',
        conflictPolicy: obj === 'Task' ? 'MostRecentWins' : 'SalesforceWins',
        isEnabled: true,
        fieldMappings: (FIELD_DEFS[obj] || []).map(f => ({ ...f })),
      };
    }
  }
  return result;
}

// ── Mock DLQ & Audit ─────────────────────────────────────────────────────────
export const MOCK_DLQ: DlqItem[] = [
  { id: 'dlq-001', org: 'Client Management', env: 'Production', eventType: 'CalendarEvent.Updated', platform: 'ExchangeOnline',  attempts: 3, lastAttempt: '2026-03-08 09:14', error: 'Graph API 429 — rate limit exceeded',                    status: 'Dead' },
  { id: 'dlq-002', org: 'Client Management', env: 'Production', eventType: 'Contact.Created',       platform: 'GoogleWorkspace', attempts: 2, lastAttempt: '2026-03-08 08:52', error: 'Service account token expired',                            status: 'Dead' },
  { id: 'dlq-003', org: 'Client Dashboard',  env: 'Production', eventType: 'Task.Deleted',           platform: 'ExchangeOnline',  attempts: 1, lastAttempt: '2026-03-08 07:30', error: 'Exchange webhook signature invalid',                       status: 'Dead' },
  { id: 'dlq-004', org: 'Client Management', env: 'UAT',        eventType: 'EmailActivity.Logged',   platform: 'ExchangeOnline',  attempts: 3, lastAttempt: '2026-03-07 23:01', error: 'Salesforce API field not found: CustomField__c',           status: 'Dead' },
  { id: 'dlq-005', org: 'Client Management', env: 'Production', eventType: 'CalendarEvent.Created',  platform: 'GoogleWorkspace', attempts: 2, lastAttempt: '2026-03-07 21:18', error: 'Conflict: MostRecentWins — stale version detected',        status: 'Retrying' },
];

export const MOCK_AUDIT: AuditEntry[] = [
  { id: 'a001', ts: '2026-03-08 09:41', user: 'admin@company.com', action: 'Config.Updated',  resource: 'Acme Corp / Production / Exchange',          detail: 'Updated subscriptionRenewalDays: 3 → 2' },
  { id: 'a002', ts: '2026-03-08 09:14', user: 'system',            action: 'Sync.Failed',     resource: 'Acme Corp / Production / CalendarEvent',     detail: 'DLQ after 3 retries — Graph 429' },
  { id: 'a003', ts: '2026-03-08 08:52', user: 'system',            action: 'Token.Expired',   resource: 'Acme Corp / Production / Google',             detail: 'Service account token refresh failed' },
  { id: 'a004', ts: '2026-03-08 08:00', user: 'admin@company.com', action: 'User.Onboarded',  resource: 'Acme Corp / Production / jane.smith@acme',   detail: 'Initial sync triggered — Exchange Online' },
  { id: 'a005', ts: '2026-03-07 17:30', user: 'admin@company.com', action: 'Mapping.Updated', resource: 'Acme Corp / Production / Contact → Exchange', detail: 'Conflict policy: SalesforceWins → MostRecentWins' },
  { id: 'a006', ts: '2026-03-07 14:22', user: 'admin@company.com', action: 'Env.Created',     resource: 'Acme Corp / UAT',                             detail: 'Environment cloned from Production' },
  { id: 'a007', ts: '2026-03-07 11:10', user: 'system',            action: 'Sync.Completed',  resource: 'Acme Corp / Production / CalendarEvent',     detail: '148 events synced — 0 conflicts' },
  { id: 'a008', ts: '2026-03-07 09:00', user: 'admin@company.com', action: 'Org.Created',     resource: 'Client Dashboard',                             detail: 'New organisation registered' },
  { id: 'a009', ts: '2026-03-06 16:45', user: 'admin@company.com', action: 'User.Imported',   resource: 'Acme Corp / Production',                     detail: 'Bulk import: 38 users imported, 2 skipped' },
  { id: 'a010', ts: '2026-03-06 12:00', user: 'system',            action: 'Token.Refreshed', resource: 'Acme Corp / Production / Salesforce',        detail: 'JWT Bearer token refreshed successfully' },
];

// ── Initial seed orgs ─────────────────────────────────────────────────────────
const SEED_ORGS: Organisation[] = [
  {
    orgId: 'org-001', name: 'Client Management', slug: 'acme-corp',
    salesforceInstanceUrl: 'https://acme.my.salesforce.com', status: 'Active',
    environments: [
      {
        envId: 'env-001', orgId: 'org-001', name: 'Production', type: 'Production', status: 'Active', isDefault: true,
        sfConfig: { instanceUrl: 'https://acme.my.salesforce.com', consumerKey: '3MVG9pRiRo...XXXX', authFlow: 'JwtBearer', sandboxName: '', apiVersion: 'v59.0', isVerified: true },
        exchangeConfig: { tenantId: '550e8400-e29b-41d4-a716', clientId: '7c9e6679-7425-40de', scopes: ['Calendars.ReadWrite', 'Contacts.ReadWrite', 'Tasks.ReadWrite', 'Mail.Read'], subscriptionRenewalDays: 2, isVerified: true },
        googleConfig: { domain: 'acme.com', clientId: '123456-abc.apps.google.com', serviceAccountEmail: 'sync@acme.iam.gserviceaccount.com', scopes: ['calendar', 'contacts', 'tasks', 'gmail.readonly'], channelTtlDays: 5, isVerified: true },
        mappings: buildDefaultMappings(),
        users: [
          { userId: 'u1', salesforceUserId: '0055g001', email: 'jane.smith@acme.com', displayName: 'Jane Smith', assignedPlatform: 'ExchangeOnline', isEnabled: true, onboardedAt: '2026-01-20', objectSyncs: { CalendarEvent: null, Contact: 'SalesforceToPlatform', Task: null, EmailActivity: null } },
          { userId: 'u2', salesforceUserId: '0055g002', email: 'john.doe@acme.com',   displayName: 'John Doe',   assignedPlatform: 'GoogleWorkspace', isEnabled: true, onboardedAt: '2026-01-20', objectSyncs: { CalendarEvent: null, Contact: null, Task: 'Disabled', EmailActivity: null } },
          { userId: 'u3', salesforceUserId: '0055g003', email: 'mike.lee@acme.com',   displayName: 'Mike Lee',   assignedPlatform: 'ExchangeOnline',  isEnabled: true, onboardedAt: null,         objectSyncs: { CalendarEvent: null, Contact: null, Task: null, EmailActivity: null } },
        ],
      },
      {
        envId: 'env-002', orgId: 'org-001', name: 'UAT', type: 'Staging', status: 'Active', isDefault: false,
        sfConfig: { instanceUrl: 'https://acme--uat.sandbox.my.salesforce.com', consumerKey: '3MVG9pRiRo...UAT', authFlow: 'JwtBearer', sandboxName: 'uat', apiVersion: 'v59.0', isVerified: true },
        exchangeConfig: { tenantId: '550e8400-e29b-41d4-a716', clientId: '7c9e6679-7425-40de', scopes: ['Calendars.ReadWrite', 'Contacts.ReadWrite'], subscriptionRenewalDays: 2, isVerified: false },
        googleConfig: null, mappings: buildDefaultMappings(), users: [],
      },
    ],
  },
  {
    orgId: 'org-002', name: 'Client Dashboard', slug: 'beta-industries',
    salesforceInstanceUrl: 'https://beta.my.salesforce.com', status: 'Active',
    environments: [
      { envId: 'env-003', orgId: 'org-002', name: 'Production', type: 'Production', status: 'Active', isDefault: true, sfConfig: null, exchangeConfig: null, googleConfig: null, mappings: buildDefaultMappings(), users: [] },
    ],
  },
  {
    orgId: 'org-003', name: 'SF009', slug: 'gamma-corp',
    salesforceInstanceUrl: 'https://gamma.my.salesforce.com', status: 'Suspended', environments: [],
  },
];

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class DataService {
  // Angular 19 signals as state
  orgs = signal<Organisation[]>(SEED_ORGS);
  pinnedOrgIds = signal<string[]>(['org-001']);
  dlqItems = signal<DlqItem[]>(MOCK_DLQ);
  auditEntries = signal<AuditEntry[]>(MOCK_AUDIT);

  // Derived
  pinnedOrgs = computed(() =>
    this.orgs().filter(o => this.pinnedOrgIds().includes(o.orgId))
  );

  updateOrg(updated: Organisation): void {
    this.orgs.update(orgs => orgs.map(o => o.orgId === updated.orgId ? updated : o));
  }

  addOrg(org: Organisation): void {
    this.orgs.update(orgs => [...orgs, org]);
  }

  updateEnv(orgId: string, env: Environment): void {
    this.orgs.update(orgs => orgs.map(o =>
      o.orgId !== orgId ? o : {
        ...o,
        environments: o.environments.map(e => e.envId === env.envId ? env : e),
      }
    ));
  }

  addEnv(orgId: string, env: Environment): void {
    this.orgs.update(orgs => orgs.map(o =>
      o.orgId !== orgId ? o : { ...o, environments: [...o.environments, env] }
    ));
  }

  togglePin(orgId: string): void {
    this.pinnedOrgIds.update(ids =>
      ids.includes(orgId) ? ids.filter(id => id !== orgId) : [...ids, orgId]
    );
  }

  retryDlq(id: string): void {
    this.dlqItems.update(items =>
      items.map(d => d.id === id ? { ...d, status: 'Retrying' as const } : d)
    );
  }

  dismissDlq(id: string): void {
    this.dlqItems.update(items => items.filter(d => d.id !== id));
  }
}
