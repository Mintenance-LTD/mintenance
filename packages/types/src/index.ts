// Shared TypeScript types for Mintenance apps
export * from './user';
export * from './auth';
export * from './api';
export * from './jobs';
// Canonical UI-side Job/Bid view + normalizers (PKG-P1-4 follow-up,
// 2026-04-25). The legacy `Job`/`Bid` types in `./jobs.ts` carry
// dual snake_case + camelCase aliases; new code should prefer
// `JobView` / `BidView` + `toJobView` / `toBidView` at the boundary.
export * from './job-view';
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
export * from './notification-types';
export * from './property';
export * from './business';
export * from './features';

// Export contract types (selective to avoid name conflicts with jobs.ts, messaging.ts)
export type {
  Contract,
  ContractStatus,
  Dispute,
  DisputeStatus,
  JobSummary,
  JobDetail,
  ContractorSummary,
  UserSummary,
  Service,
  TimelineEvent,
  ThreadSummary,
  Paginated,
} from './contracts';
