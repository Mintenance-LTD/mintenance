/**
 * Input Component Index
 * 
 * Main export for Input component - Web-only exports to avoid React Native imports
 */

// Export web-only component to avoid React Native bundling issues in web builds
export { Input } from './Input.web';
export type { WebInputProps, BaseInputProps, InputType, InputSize } from './types';
