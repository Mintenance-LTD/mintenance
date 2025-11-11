/**
 * Shared Button Component Props
 * 
 * Common interface for Button component across web and mobile platforms
 */

import React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'gradient-primary'
  | 'gradient-success';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface BaseButtonProps {
  // Content
  children: React.ReactNode;

  // Variants & styling
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;

  // States
  disabled?: boolean;
  loading?: boolean;

  // Icons
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;

  // Accessibility
  'aria-label'?: string;
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'none';

  // Testing
  testID?: string;
}

// Conditional React Native types - only available in native builds
// For web builds, these types are not needed
// Using Record<string, unknown> instead of importing from react-native to avoid bundling issues
type ViewStyle = Record<string, unknown>;
type TextStyle = Record<string, unknown>;

// Web-specific props
export interface WebButtonProps extends Omit<BaseButtonProps, 'aria-busy' | 'aria-disabled'>, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

// Native-specific props
export interface NativeButtonProps extends BaseButtonProps {
  onPress?: () => void;
  onLongPress?: () => void;
  hapticFeedback?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

