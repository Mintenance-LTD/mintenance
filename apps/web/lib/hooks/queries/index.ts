/**
 * React Query Hooks Index
 *
 * Export all query hooks for easy importing
 *
 * @example
 * ```tsx
 * import { useJobs, useJob, useCreateJob } from '@/lib/hooks/queries';
 * ```
 */

// Jobs
export {
  useJobs,
  useJob,
  useCreateJob,
  useUpdateJob,
  usePrefetchJob,
} from './useJobs';

// Contractors
export {
  useContractors,
  useContractor,
  useContractorReviews,
  useContractorSearch,
} from './useContractors';

// Profile & Auth
export {
  useProfile,
  useUserProfile,
  useUpdateProfile,
  useAuth,
} from './useProfile';

// Bids
export {
  useJobBids,
  useContractorBids,
  useSubmitBid,
  useAcceptBid,
} from './useBids';

// Messages
export {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
} from './useMessages';

// Re-export types
export type { Bid } from './useBids';
export type { Message, Conversation } from './useMessages';
export type { ContractorProfile } from './useContractors';
