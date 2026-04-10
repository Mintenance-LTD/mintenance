'use client';

import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@mintenance/shared-ui';
import {
  CardBase,
  type CardProps,
  type CardVariant,
  type CardPadding,
} from './Card.unified.base';
import { MetricCard } from './Card.unified.metric';
import { ProgressCard } from './Card.unified.progress';
import { DashboardCard } from './Card.unified.dashboard';

/**
 * Unified Card Component
 * Consolidates Card, DashboardCard, StandardCard, StatCard, MetricCard, ProgressCard
 *
 * @example
 * // Simple card
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>Content</CardContent>
 * </Card>
 *
 * // Dashboard/Metric card
 * <Card.Metric
 *   label="Total Revenue"
 *   value="£15,000"
 *   icon="currencyDollar"
 *   trend={{ direction: 'up', value: '+12%', label: 'from last month' }}
 * />
 *
 * // Progress card
 * <Card.Progress
 *   label="Project Completion"
 *   current={75}
 *   total={100}
 *   icon="briefcase"
 * />
 */

// Main Card export (attaches sub-components below)
export const Card = CardBase as typeof CardBase & {
  Metric: typeof MetricCard;
  Progress: typeof ProgressCard;
  Dashboard: typeof DashboardCard;
  Header: typeof CardHeader;
  Title: typeof CardTitle;
  Description: typeof CardDescription;
  Content: typeof CardContent;
  Footer: typeof CardFooter;
};

Card.Metric = MetricCard;
Card.Progress = ProgressCard;
Card.Dashboard = DashboardCard;
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

// Type re-exports
// Specialized variant re-exports (preserved for direct named imports)
// Re-export shared sub-components
export {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@mintenance/shared-ui';
