/**
 * Badge Component - Unified Export
 * 
 * For web builds, this file should not be used directly.
 * Use Badge.web.tsx instead to avoid React Native imports.
 */

// Only import web version to avoid React Native bundling in web builds
// Native builds will use Badge.native.tsx directly
import { Badge as WebBadge } from './Badge.web';

// Export types
export type { WebBadgeProps, NativeBadgeProps, BaseBadgeProps, BadgeVariant, BadgeSize } from './types';

// Export web component (native builds should import Badge.native.tsx directly)
export const Badge = WebBadge;

export default Badge;

