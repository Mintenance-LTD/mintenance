// ============================================================================
// UI COMPONENT LIBRARY INDEX
// Mintenance App - Standardized Component System
// ============================================================================

// Error Handling Components
export {
  ErrorBoundary,
  withErrorBoundary,
  type ErrorBoundaryProps,
  type ErrorFallbackProps,
} from './ErrorBoundary';

// Loading State Components
export {
  LoadingSpinner,
  LoadingOverlay,
  InlineLoader,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonDashboard,
  SkeletonJobDetails,
  SkeletonProfile,
  type LoadingProps,
  type SkeletonProps,
  type SkeletonCardProps,
} from './LoadingStates';

// Standardized UI Components (default exports)
export { default as Button } from './Button';
export { default as Typography } from './Typography';
export { default as Input } from './Input';
export { default as Card } from './Card';
export { default as Badge } from './Badge';
export { default as ThemeToggle } from './ThemeToggle';
export { default as Animated } from './Animated';
export { default as Toast } from './Toast';
export { default as Banner } from './Banner';

// Named component exports
export {
  type ButtonProps,
} from './Button';

export {
  H1, H2, H3, H4, H5, H6,
  Display1, Display2,
  Subtitle1, Subtitle2,
  Body1, Body2,
  Caption, Overline,
  type TypographyProps,
  type TypographyVariant,
  type TypographyColor,
  type TypographyAlign,
} from './Typography';

// Import directly from individual files to avoid export resolution issues

// Card components - commented out to avoid export resolution issues
// export {
//   Card as CardComponent,
//   CardHeader,
//   CardBody,
//   CardFooter,
//   JobCard,
//   ContractorCard,
//   StatCard,
//   type CardProps,
// } from './Card';

export {
  Chip,
  NotificationBadge,
  type BadgeProps,
  type ChipProps,
  type NotificationBadgeProps,
} from './Badge';

export {
  ThemeModeSelector,
  type ThemeToggleProps,
  type ThemeModeSelectorProps,
} from './ThemeToggle';

export {
  AnimatedView,
  MicroInteraction,
  StaggerAnimation,
  LoadingAnimation,
  type AnimatedViewProps,
  type MicroInteractionProps,
  type StaggerAnimationProps,
  type LoadingAnimationProps,
  type AnimationType,
  type EasingType,
} from './Animated';

export {
  ToastManager,
  toastManager,
  useToast,
  type ToastProps,
  type ToastConfig,
  type ToastType,
  type ToastPosition,
  type ToastPreset,
  type ToastAction,
} from './Toast';

export { type BannerProps } from './Banner';

// ============================================================================
// COMPONENT CATEGORIES
// ============================================================================

// Import all components for organized exports
import * as ErrorComponents from './ErrorBoundary';
import * as LoadingComponents from './LoadingStates';
import Button from './Button';
import Typography from './Typography';
import Input from './Input';
import Card from './Card';
import Badge from './Badge';
import ThemeToggle from './ThemeToggle';
import Animated from './Animated';
import Toast from './Toast';
import Banner from './Banner';

// Organized exports by category
export const UI = {
  // Error Handling
  ErrorBoundary: ErrorComponents.ErrorBoundary,
  withErrorBoundary: ErrorComponents.withErrorBoundary,

  // Loading States
  LoadingSpinner: LoadingComponents.LoadingSpinner,
  LoadingOverlay: LoadingComponents.LoadingOverlay,
  InlineLoader: LoadingComponents.InlineLoader,
  Skeleton: LoadingComponents.Skeleton,
  SkeletonCard: LoadingComponents.SkeletonCard,
  SkeletonList: LoadingComponents.SkeletonList,
  SkeletonDashboard: LoadingComponents.SkeletonDashboard,
  SkeletonJobDetails: LoadingComponents.SkeletonJobDetails,
  SkeletonProfile: LoadingComponents.SkeletonProfile,

  // Core UI Components
  Button,
  Typography,
  Input,
  Card,
  Badge,

  // Advanced UI Components
  ThemeToggle,
  Animated,
  Toast,
  Banner,

  // TODO: Add remaining components as they're standardized
  // Modal: Modal,
  // Avatar: Avatar,
  // Dropdown: Dropdown,
};

// Default export for convenience
export default UI;