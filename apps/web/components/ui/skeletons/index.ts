/**
 * Skeleton Loaders Export Index
 *
 * Centralized exports for all skeleton loader components.
 * Use these to replace loading spinners throughout the application.
 */

// Base skeleton components
export { default as Skeleton } from '../Skeleton';
export type { SkeletonProps } from '../Skeleton';
export {
  SkeletonGroup,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonBadge,
  SkeletonImage,
} from '../Skeleton';

// Content-shaped skeletons
export { JobCardSkeleton } from './JobCardSkeleton';
export type { JobCardSkeletonProps } from './JobCardSkeleton';

export { ContractorCardSkeleton } from './ContractorCardSkeleton';
export type { ContractorCardSkeletonProps } from './ContractorCardSkeleton';

export { DashboardSkeleton } from './DashboardSkeleton';
export type { DashboardSkeletonProps } from './DashboardSkeleton';

export { MessageListSkeleton } from './MessageListSkeleton';
export type { MessageListSkeletonProps } from './MessageListSkeleton';

export { FormSkeleton } from './FormSkeleton';
export type { FormSkeletonProps } from './FormSkeleton';

export { TableSkeleton } from './TableSkeleton';
export type { TableSkeletonProps } from './TableSkeleton';
