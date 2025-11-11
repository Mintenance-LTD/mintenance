// Platform utilities
// Note: usePlatform is not exported for web builds to avoid React Native bundling issues
// Web builds should use direct web component imports instead
export * from './utils/cn';

// Button component - Direct web export (no unified wrapper to avoid React Native imports)
export { Button } from './components/Button/Button.web';
// Only export web types to avoid React Native type resolution issues
export type { WebButtonProps, BaseButtonProps, ButtonVariant, ButtonSize } from './components/Button/types';

// Card component - Direct web export (no unified wrapper to avoid React Native imports)
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './components/Card/Card.web';
// Only export web types to avoid React Native type resolution issues
export type { WebCardProps, BaseCardProps, CardVariant, CardPadding } from './components/Card/types';

// Input component - Direct web export (no unified wrapper to avoid React Native imports)
export { Input } from './components/Input/Input.web';
// Only export web types to avoid React Native type resolution issues
export type { WebInputProps, BaseInputProps, InputType, InputSize } from './components/Input/types';

// Badge component - Direct web export (no unified wrapper to avoid React Native imports)
export { Badge } from './components/Badge/Badge.web';
// Only export web types to avoid React Native type resolution issues
export type { WebBadgeProps, BaseBadgeProps, BadgeVariant, BadgeSize } from './components/Badge/types';

// Original components (to be migrated)
export * from './components/TextInput';

// Modern shared components
export * from './components/StatusBadge';
export * from './components/MetricCard';
export * from './components/DataTable';
export * from './components/CircularProgress';
export * from './components/Icon';
