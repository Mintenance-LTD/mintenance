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

export { ErrorView } from './ErrorView';
export type { ErrorViewProps } from './ErrorView';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { Navigation } from './Navigation';
export type { NavigationProps, NavigationItem } from './Navigation';

export { Layout } from './Layout';
export type { LayoutProps } from './Layout';

// Re-export theme for component consumers
export { theme, getColor, getSpacing, getFontSize, getShadow, getStatusColor, getPriorityColor } from '@/lib/theme';
export type { Theme } from '@/lib/theme';