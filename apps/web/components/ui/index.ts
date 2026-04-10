// Web UI Component Library
// Cross-platform compatible components adapted from mobile designs

// Legacy components - use Unified* versions instead
// export { Button } from './Button';
// export type { ButtonProps } from './Button';

// export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
// export type { CardProps } from './Card';

export { Input } from './Input';
export { LoadingSpinner } from './LoadingSpinner';
export { ErrorView } from './ErrorView';
// Note: StatusChip, MetricCard, Badge, and other card variants are now in unified components:
// - Badge.unified.tsx (replaces Badge, StatusBadge, StatusChip)
// - Card.unified.tsx (replaces DashboardCard, StandardCard, StatCard, MetricCard, ProgressCard)

// Re-export theme for component consumers
// shadcn/ui Components
// ============================================
// UNIFIED DESIGN SYSTEM COMPONENTS
// ============================================

// UnifiedButton - Consistent button component using design tokens
// Button components from UnifiedButton (for backwards compatibility)
export { default as Button } from './UnifiedButton';

// UnifiedCard - Consistent card component using design tokens
// Card components from UnifiedCard (no duplicates)
// Card component from UnifiedCard (for backwards compatibility)
export { default as Card } from './UnifiedCard';

// StandardHeading - Typography hierarchy enforcement
// ============================================
// FEATURE ACCESS SYSTEM COMPONENTS
// ============================================

// FeatureGate - Feature access control components

// Paywall - Subscription upgrade prompts
