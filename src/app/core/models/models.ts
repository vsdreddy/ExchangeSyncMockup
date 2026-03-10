export type SyncDirection =
  | 'Bidirectional'
  | 'SalesforceToPlatform'
  | 'PlatformToSalesforce'
  | 'Disabled';

export type ConflictPolicy = 'SalesforceWins' | 'PlatformWins' | 'MostRecentWins';
export type AuthFlow = 'JwtBearer' | 'OAuthAuthorizationCode';
export type EnvType = 'Production' | 'Staging' | 'Development' | 'Custom';
export type OrgStatus = 'Active' | 'Suspended' | 'Archived';
export type Platform = 'ExchangeOnline' | 'GoogleWorkspace' | 'Unassigned';

export interface FieldMapping {
  id: string;
  sfField: string;
  targetField: string;
  transform: 'Direct' | 'Concatenate' | 'Lookup' | 'DateFormat' | 'Custom';
  required: boolean;
}

export interface ObjectMapping {
  objectType: string;
  targetPlatform: Platform;
  defaultSyncDirection: SyncDirection;
  conflictPolicy: ConflictPolicy;
  isEnabled: boolean;
  fieldMappings: FieldMapping[];
}

export interface SalesforceConfig {
  instanceUrl: string;
  consumerKey: string;
  authFlow: AuthFlow;
  sandboxName: string;
  apiVersion: string;
  isVerified: boolean;
}

export interface ExchangeConfig {
  tenantId: string;
  clientId: string;
  scopes: string[];
  subscriptionRenewalDays: number;
  isVerified: boolean;
}

export interface GoogleConfig {
  domain: string;
  clientId: string;
  serviceAccountEmail: string;
  scopes: string[];
  channelTtlDays: number;
  isVerified: boolean;
}

export interface UserObjectSync {
  [objectType: string]: SyncDirection | null;
}

export interface SyncUser {
  userId: string;
  salesforceUserId: string;
  email: string;
  displayName: string;
  assignedPlatform: Platform;
  isEnabled: boolean;
  onboardedAt: string | null;
  objectSyncs: UserObjectSync;
}

export interface Environment {
  envId: string;
  orgId: string;
  name: string;
  type: EnvType;
  status: string;
  isDefault: boolean;
  sfConfig: SalesforceConfig | null;
  exchangeConfig: ExchangeConfig | null;
  googleConfig: GoogleConfig | null;
  mappings: { [key: string]: ObjectMapping };
  users: SyncUser[];
}

export interface Organisation {
  orgId: string;
  name: string;
  slug: string;
  salesforceInstanceUrl: string;
  status: OrgStatus;
  environments: Environment[];
}

export interface DlqItem {
  id: string;
  org: string;
  env: string;
  eventType: string;
  platform: Platform;
  attempts: number;
  lastAttempt: string;
  error: string;
  status: 'Dead' | 'Retrying';
}

export interface AuditEntry {
  id: string;
  ts: string;
  user: string;
  action: string;
  resource: string;
  detail: string;
}

export const OBJECT_TYPES = ['CalendarEvent', 'Contact', 'Task', 'EmailActivity'] as const;
export const PLATFORMS = ['ExchangeOnline', 'GoogleWorkspace'] as const;

export const OBJECT_META: Record<string, { icon: string; label: string }> = {
  CalendarEvent: { icon: '📅', label: 'Calendar Event' },
  Contact:       { icon: '👤', label: 'Contact' },
  Task:          { icon: '✅', label: 'Task' },
  EmailActivity: { icon: '📧', label: 'Email Activity' },
};

export const PLATFORM_META: Record<string, { label: string; short: string }> = {
  ExchangeOnline:  { label: 'Exchange Online',  short: 'Exchange' },
  GoogleWorkspace: { label: 'Google Workspace', short: 'Google' },
  Unassigned:      { label: 'Unassigned',        short: '—' },
};

export const DIRECTION_OPTIONS: { value: SyncDirection; label: string }[] = [
  { value: 'Bidirectional',        label: '⇄  Bidirectional' },
  { value: 'SalesforceToPlatform', label: '→  SF → Platform' },
  { value: 'PlatformToSalesforce', label: '←  Platform → SF' },
  { value: 'Disabled',             label: '⊘  Disabled' },
];
