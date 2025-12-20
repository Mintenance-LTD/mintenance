/**
 * Badge Component Index
 * 
 * Main export for Badge component - Web-only exports to avoid React Native imports
 */

// Export web-only component to avoid React Native bundling issues in web builds
export { Badge } from './Badge.web';
export type { WebBadgeProps, BaseBadgeProps, BadgeVariant, BadgeSize } from './types';
