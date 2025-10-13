// Web UI Component Library
// Cross-platform compatible components adapted from mobile designs

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Card } from './Card';
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

export { StatusChip } from './StatusChip';
export type { StatusChipProps } from './StatusChip';

export { NotificationBanner } from './NotificationBanner';
export type { NotificationBannerProps } from './NotificationBanner';

export { MetricCard } from './MetricCard';

export { ActivityTimeline } from './ActivityTimeline';
export type { Activity } from './ActivityTimeline';

// Re-export theme for component consumers
export { theme, getColor, getSpacing, getFontSize, getShadow, getStatusColor, getPriorityColor } from '@/lib/theme';
export type { Theme } from '@/lib/theme';
