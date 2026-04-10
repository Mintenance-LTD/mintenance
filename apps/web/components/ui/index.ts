// Web UI Component Library
// Cross-platform compatible components adapted from mobile designs

// Legacy components - use Unified* versions instead
// export { Button } from './Button';
// export type { ButtonProps } from './Button';

// export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
// export type { CardProps } from './Card';

export { Input } from './Input';
export { Badge, StatusBadge, CountBadge } from './Badge.unified';
export { LoadingSpinner } from './LoadingSpinner';
export { ErrorBoundary } from './ErrorBoundary';

export { ErrorView } from './ErrorView';
export { SkipLink } from './SkipLink';

export { Breadcrumbs } from './Breadcrumbs';
export { MobileNavigation } from './MobileNavigation';

export {
  SkeletonLoader,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  SkeletonButton,
  SkeletonAvatar,
  SkeletonText,
} from './SkeletonLoader';

export { Touchable, TouchableButton, TouchableCard } from './Touchable';

export { TouchButton } from './TouchButton';

export { ResponsiveGrid, GridArea } from './ResponsiveGrid';
export { SwipeableCarousel } from './SwipeableCarousel';

export { FloatingActionButton, SpeedDial } from './FloatingActionButton';

export { PullToRefresh } from './PullToRefresh';

export { PageHeader } from './PageHeader';
export { Navigation } from './Navigation';
export { Layout } from './Layout';
export { ProgressBar } from './ProgressBar';
export { NotificationBanner } from './NotificationBanner';
export { ToastProvider, useToast } from './Toast';
export { EmptyState } from './EmptyState';
export { DataTable } from './DataTable';
// Note: StatusChip, MetricCard, Badge, and other card variants are now in unified components:
// - Badge.unified.tsx (replaces Badge, StatusBadge, StatusChip)
// - Card.unified.tsx (replaces DashboardCard, StandardCard, StatCard, MetricCard, ProgressCard)

export { ActivityTimeline } from './ActivityTimeline';
export { Modal } from './Modal';
// Re-export theme for component consumers
export {
  theme,
  getColor,
  getSpacing,
  getFontSize,
  getShadow,
  getStatusColor,
  getPriorityColor,
} from '@/lib/theme';
// shadcn/ui Components
export { Label } from './label';
export { Separator } from './separator';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
export { Alert, AlertTitle, AlertDescription } from './alert';
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog';
export { Checkbox } from './checkbox';
export { RadioGroup, RadioGroupItem } from './radio-group';
export { Switch } from './switch';

export { Icon, IconFilled } from './Icon';
export { GradientCard } from './GradientCard';

export { StandardCard } from './StandardCard';
export { IconContainer } from './IconContainer';
// ============================================
// UNIFIED DESIGN SYSTEM COMPONENTS
// ============================================

// UnifiedButton - Consistent button component using design tokens
export {
  default as UnifiedButton,
  ButtonGroup,
  IconButton,
} from './UnifiedButton';
// Button components from UnifiedButton (for backwards compatibility)
export { default as Button } from './UnifiedButton';

// UnifiedCard - Consistent card component using design tokens
export {
  default as UnifiedCard,
  CardGrid,
  StatCard,
  ActionCard,
} from './UnifiedCard';
// Card components from UnifiedCard (no duplicates)
export {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './UnifiedCard';

// Card component from UnifiedCard (for backwards compatibility)
export { default as Card } from './UnifiedCard';

// StandardHeading - Typography hierarchy enforcement
export {
  default as StandardHeading,
  PageTitle,
  SectionHeading,
  SubsectionHeading,
  CardHeading,
  HeadingGroup,
  SupportingText,
} from './StandardHeading';
// ============================================
// FEATURE ACCESS SYSTEM COMPONENTS
// ============================================

// FeatureGate - Feature access control components
export {
  FeatureGate,
  FeatureButton,
  FeatureBadge,
  withFeatureAccess,
} from './FeatureGate';

// Paywall - Subscription upgrade prompts
export { Paywall, PaywallBanner } from './Paywall';
