// Web UI Component Library
// Cross-platform compatible components adapted from mobile designs

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
export type { CardProps } from './Card';

export { Input } from './Input';
export type { InputProps } from './Input';

export { LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';

export { ErrorBoundary } from './ErrorBoundary';

export { ErrorView } from './ErrorView';
export type { ErrorViewProps } from './ErrorView';

export { SkipLink } from './SkipLink';

export { Breadcrumbs } from './Breadcrumbs';
export type { BreadcrumbsProps, BreadcrumbItem } from './Breadcrumbs';

export { MobileNavigation } from './MobileNavigation';

export { SkeletonLoader, SkeletonCard, SkeletonList, SkeletonTable, SkeletonButton, SkeletonAvatar, SkeletonText } from './SkeletonLoader';

export { Touchable, TouchableButton, TouchableCard } from './Touchable';

export { TouchButton } from './TouchButton';

export { ResponsiveGrid, AutoFitGrid, MasonryGrid, FlexGrid } from './ResponsiveGrid';

export { SwipeableCarousel } from './SwipeableCarousel';

export { FloatingActionButton, SpeedDial } from './FloatingActionButton';

export { PullToRefresh } from './PullToRefresh';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { Navigation } from './Navigation';
export type { NavigationProps, NavigationItem } from './Navigation';

export { Layout } from './Layout';
export type { LayoutProps } from './Layout';

export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

export { NotificationBanner } from './NotificationBanner';
export type { NotificationBannerProps } from './NotificationBanner';

export { ToastProvider, useToast } from './Toast';
export type { Toast, ToastType } from './Toast';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { DataTable } from './DataTable';
export type { Column } from './DataTable';

// Note: StatusChip, MetricCard, Badge, and other card variants are now in unified components:
// - Badge.unified.tsx (replaces Badge, StatusBadge, StatusChip)
// - Card.unified.tsx (replaces DashboardCard, StandardCard, StatCard, MetricCard, ProgressCard)

export { ActivityTimeline } from './ActivityTimeline';
export type { Activity } from './ActivityTimeline';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

// Re-export theme for component consumers
export { theme, getColor, getSpacing, getFontSize, getShadow, getStatusColor, getPriorityColor } from '@/lib/theme';
export type { Theme } from '@/lib/theme';

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

export { GradientCard } from './GradientCard';