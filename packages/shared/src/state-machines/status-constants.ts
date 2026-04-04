/**
 * Canonical status constants for all Mintenance entities.
 * Use these instead of hardcoded string literals.
 */

export const JOB_STATUS = {
  POSTED: 'posted',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
} as const;

export type JobStatusValue = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const BID_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

export type BidStatusValue = (typeof BID_STATUS)[keyof typeof BID_STATUS];

export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  PENDING_HOMEOWNER: 'pending_homeowner',
  PENDING_CONTRACTOR: 'pending_contractor',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export type ContractStatusValue = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS];

export const ESCROW_STATUS = {
  PENDING: 'pending',
  HELD: 'held',
  RELEASE_PENDING: 'release_pending',
  RELEASED: 'released',
  REFUNDED: 'refunded',
  AWAITING_HOMEOWNER_APPROVAL: 'awaiting_homeowner_approval',
  PENDING_REVIEW: 'pending_review',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type EscrowStatusValue = (typeof ESCROW_STATUS)[keyof typeof ESCROW_STATUS];
