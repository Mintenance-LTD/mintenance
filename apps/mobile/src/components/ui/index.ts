// ============================================================================
// UI COMPONENT LIBRARY INDEX
// Mintenance App - Standardized Component System
// ============================================================================

// Error Handling Components
// ============================================================================
// COMPONENT CATEGORIES
// ============================================================================

// Import all components for organized exports
import * as ErrorComponents from './ErrorBoundary';
import * as LoadingComponents from './LoadingStates';
import { Button } from './Button';
import Typography from './Typography';
import { Input } from './Input';
import { Card } from './Card';
import Badge from './Badge';
import ThemeToggle from './ThemeToggle';
import Animated from './Animated';
import Toast from './Toast';
import { Banner } from './Banner';

// Loading State Components
// Standardized UI Components (default exports)
export { default as Badge } from './Badge';
// Named component exports
export { H1, H2, H3, Body1, Body2, Caption } from './Typography';

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

// Organized exports by category
const UI = {
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

  // Modal, Avatar, and Dropdown components are not yet created in ui/.
  // Export them here once they are standardized and added to this directory.
};

// Default export for convenience
