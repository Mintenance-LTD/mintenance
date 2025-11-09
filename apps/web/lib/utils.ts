import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for combining Tailwind CSS classes with conditional logic
 * 
 * Uses clsx for conditional classes and tailwind-merge to intelligently merge
 * conflicting Tailwind classes (e.g., "px-2 px-4" becomes "px-4")
 * 
 * @example
 * cn("base-class", isActive && "active-class", { "conditional": condition })
 * cn("px-4", "py-2", variant === "primary" && "bg-primary")
 * cn("px-2", "px-4") // Results in "px-4" (last one wins)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

