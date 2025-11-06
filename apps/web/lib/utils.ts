/**
 * Utility function for combining Tailwind CSS classes with conditional logic
 * 
 * This function merges class names intelligently, handling:
 * - String class names
 * - Conditional classes (using objects or ternary operators)
 * - Arrays of classes
 * - Undefined/null values (safely ignored)
 * 
 * @example
 * cn("base-class", isActive && "active-class", { "conditional": condition })
 * cn("px-4", "py-2", variant === "primary" && "bg-primary")
 */
export function cn(...inputs: (string | undefined | null | boolean | Record<string, boolean>)[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) classes.push(inner);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.filter(Boolean).join(' ');
}

