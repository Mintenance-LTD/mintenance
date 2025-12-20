/**
 * Input Component - Unified Export
 * 
 * For web builds, this file should not be used directly.
 * Use Input.web.tsx instead to avoid React Native imports.
 */

// Only import web version to avoid React Native bundling in web builds
// Native builds will use Input.native.tsx directly
import { Input as WebInput } from './Input.web';

// Export types
export type { WebInputProps, NativeInputProps, BaseInputProps, InputType, InputSize } from './types';

// Export web component (native builds should import Input.native.tsx directly)
export const Input = WebInput;

export default Input;

