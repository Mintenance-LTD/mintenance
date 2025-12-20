/**
 * GradientBar Component
 * Reusable gradient bar decoration for cards and sections
 */
export function GradientBar() {
  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10" />
  );
}

