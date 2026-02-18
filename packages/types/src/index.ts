// Shared TypeScript types for Mintenance apps
export * from './user';
export * from './auth';
export * from './api';
export * from './jobs';
export * from './location';
export * from './messaging';
export * from './contractor';
export * from './video';
export * from './payments';
export * from './search';
export * from './timeline';
export * from './social';
export * from './subscriptions';
export * from './google-places';
export * from './meetings';
export * from './notifications';
export * from './property';
export * from './business';
export * from './features';

// Export contract types (selective to avoid name conflicts with jobs.ts, messaging.ts)
export type {
  Contract, ContractStatus, Dispute, DisputeStatus,
  JobSummary, JobDetail, ContractorSummary, UserSummary, Service, TimelineEvent, ThreadSummary, Paginated
} from './contracts';