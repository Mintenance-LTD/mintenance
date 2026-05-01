/**
 * @mintenance/api-contracts
 *
 * Typed request/response schemas shared between web and mobile apps.
 * Provides compile-time safety for API contracts.
 *
 * Design: Pure Zod validation (no DOMPurify/sanitization transforms).
 * Web layer applies sanitization on top via .transform() extensions.
 */
export * from './common';
export * from './auth';
export * from './jobs';
// 2026-05-01 audit P1 close-out: shared `JobDraft` form-level model +
// `toCreateJobRequest` adapter so all 7 job-creation entry points
// validate identically to the server schema. See `job-draft.ts` for
// the full rationale.
export * from './job-draft';
export * from './bids';
export * from './payments';
export * from './contracts';
export * from './notifications';
export * from './properties';
export * from './invoices';
export * from './messages';
export * from './users';
