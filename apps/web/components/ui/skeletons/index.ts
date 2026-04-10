/**
 * Skeleton Loaders Export Index
 *
 * Centralized exports for all skeleton loader components.
 * Use these to replace loading spinners throughout the application.
 */

// Base skeleton components
export { default as Skeleton } from '../Skeleton';
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
export { ContractorCardSkeleton } from './ContractorCardSkeleton';
export { DashboardSkeleton } from './DashboardSkeleton';
export { MessageListSkeleton } from './MessageListSkeleton';
export { FormSkeleton } from './FormSkeleton';
export { TableSkeleton } from './TableSkeleton';
// Performance-optimized skeletons for code splitting
export { MapSkeleton } from './MapSkeleton';
export { ChartSkeleton } from './ChartSkeleton';
