/**
 * Shared Input Component Props
 * 
 * Common interface for Input component across web and mobile platforms
 */

import React from 'react';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
export type InputSize = 'sm' | 'md' | 'lg';

export interface BaseInputProps {
  // Value
  value?: string;
  defaultValue?: string;
  placeholder?: string;

  // Configuration
  type?: InputType;
  size?: InputSize;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;

  // Label & Helper
  label?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;

  // Icons
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;

  // States
  error?: boolean;
  success?: boolean;

  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;

  // Testing
  testID?: string;
}

// Web-specific props - omit all conflicting properties
export interface WebInputProps extends Omit<BaseInputProps, 'value' | 'defaultValue' | 'placeholder' | 'type' | 'disabled' | 'readOnly' | 'required' | 'autoFocus' | 'autoComplete' | 'aria-label' | 'aria-describedby' | 'aria-invalid'>, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  // Re-add BaseInputProps properties with explicit types
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: InputType;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  
  // Web-specific handlers
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Native-specific props
export interface NativeInputProps extends BaseInputProps {
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  style?: unknown; // ViewStyle
  inputStyle?: unknown; // TextStyle
  containerStyle?: unknown; // ViewStyle
}

