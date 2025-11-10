/**
 * Utility function for conditional class names
 * Similar to clsx/cn but simpler
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

