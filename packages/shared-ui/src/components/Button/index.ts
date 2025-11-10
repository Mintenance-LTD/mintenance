/**
 * Button Component Index
 * 
 * Main export for Button component - Web-only exports to avoid React Native imports
 */

// Export web-only component to avoid React Native bundling issues in web builds
export { Button } from './Button.web';
export type { WebButtonProps, BaseButtonProps, ButtonVariant, ButtonSize } from './types';
