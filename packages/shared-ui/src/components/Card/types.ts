/**
 * Shared Card Component Props
 * 
 * Common interface for Card component across web and mobile platforms
 */

import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'outlined';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface BaseCardProps {
  // Content
  children: React.ReactNode;

  // Variants & styling
  variant?: CardVariant;
  padding?: CardPadding;

  // States
  disabled?: boolean;

  // Accessibility
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'article' | 'none';

  // Testing
  testID?: string;
}

// Web-specific props
export interface WebCardProps extends Omit<BaseCardProps, 'children'>, Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'> {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  hover?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Native-specific props
// Note: We avoid importing ViewStyle from react-native here to prevent web bundlers from trying to resolve react-native
export interface NativeCardProps extends BaseCardProps {
  interactive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  activeOpacity?: number;
  style?: unknown; // ViewStyle in native builds, but we use unknown here to avoid importing react-native
}

