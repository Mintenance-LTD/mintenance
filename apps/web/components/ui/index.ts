// Web UI Component Library
// Cross-platform compatible components adapted from mobile designs

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Card } from './Card';
export type { CardProps } from './Card';

export { Input } from './Input';
export type { InputProps } from './Input';

// Re-export theme for component consumers
export { theme, getColor, getSpacing, getFontSize, getShadow, getStatusColor, getPriorityColor } from '@/lib/theme';
export type { Theme } from '@/lib/theme';