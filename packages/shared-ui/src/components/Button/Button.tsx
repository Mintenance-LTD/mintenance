/**
 * Button Component - Unified Export
 * 
 * Exports platform-specific Button component based on runtime environment
 * 
 * For web builds, this file should not be used directly.
 * Use Button.web.tsx instead to avoid React Native imports.
 */

// Only import web version to avoid React Native bundling in web builds
// Native builds will use Button.native.tsx directly
import { Button as WebButton } from './Button.web';

// Export types
export type { WebButtonProps, NativeButtonProps, BaseButtonProps, ButtonVariant, ButtonSize } from './types';

// Export web component (native builds should import Button.native.tsx directly)
export const Button = WebButton;

export default Button;

