/**
 * Card Component - Unified Export
 *
 * For web builds, this file should not be used directly.
 * Use Card.web.tsx instead to avoid React Native imports.
 */
// Only import web version to avoid React Native bundling in web builds
// Native builds will use Card.native.tsx directly
import {
  Card as WebCard,
  CardHeader as WebCardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter as WebCardFooter,
} from './Card.web';
// Export types
// Export web component (native builds should import Card.native.tsx directly)
export const Card = WebCard;
// Export sub-components (web-only)
const CardHeader = WebCardHeader;
const CardFooter = WebCardFooter;
