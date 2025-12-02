/**
 * Mobile Skeleton Loaders Export Index
 *
 * Centralized exports for all mobile skeleton loader components.
 * Use these to replace loading spinners in the React Native app.
 */

// Base skeleton components
export { default as Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';
export {
  SkeletonGroup,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonImage,
} from './Skeleton';

// Content-shaped skeletons
export { JobCardSkeleton } from './JobCardSkeleton';
export type { JobCardSkeletonProps } from './JobCardSkeleton';

export { ContractorCardSkeleton } from './ContractorCardSkeleton';
export type { ContractorCardSkeletonProps } from './ContractorCardSkeleton';

export { MessageItemSkeleton } from './MessageItemSkeleton';
export type { MessageItemSkeletonProps } from './MessageItemSkeleton';

export { ListSkeleton } from './ListSkeleton';
export type { ListSkeletonProps } from './ListSkeleton';
