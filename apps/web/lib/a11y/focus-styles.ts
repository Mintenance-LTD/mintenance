/**
 * WCAG 2.1 AA Compliant Focus Styles
 *
 * Provides consistent focus indicators across the app
 * Meeting WCAG Success Criterion 2.4.7 (Focus Visible)
 */

export const focusRing = {
  // Primary focus style (teal)
  primary: 'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',

  // Secondary focus style (emerald)
  secondary: 'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',

  // Danger/error focus style (rose)
  danger: 'focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2',

  // White background focus (for dark surfaces)
  onDark: 'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800',

  // Visible focus for keyboard users only
  visible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
};

/**
 * Generates WCAG-compliant focus styles as inline CSS
 */
export function getFocusStyles(variant: 'primary' | 'secondary' | 'danger' | 'onDark' = 'primary') {
  const colors = {
    primary: {
      outline: 'none',
      ring: '2px solid #14B8A6', // teal-500
      offset: '2px',
    },
    secondary: {
      outline: 'none',
      ring: '2px solid #10B981', // emerald-500
      offset: '2px',
    },
    danger: {
      outline: 'none',
      ring: '2px solid #F43F5E', // rose-500
      offset: '2px',
    },
    onDark: {
      outline: 'none',
      ring: '2px solid #FFFFFF',
      offset: '2px',
    },
  };

  return colors[variant];
}

/**
 * Skip link styles for keyboard navigation
 */
export const skipLinkStyles = `
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 999;
  padding: 1rem 1.5rem;
  background-color: #14B8A6;
  color: white;
  text-decoration: none;
  border-radius: 0 0 0.375rem 0.375rem;
  font-weight: 600;

  &:focus {
    left: 0.5rem;
    outline: none;
    box-shadow: 0 0 0 2px white, 0 0 0 4px #14B8A6;
  }
`;

/**
 * Get focus style CSS string for inline styles
 * Returns box-shadow for WCAG 2.1 AA compliant focus indicator
 */
export function getFocusStyleCSS(variant: 'primary' | 'secondary' | 'danger' | 'onDark' = 'primary'): string {
  const boxShadows = {
    primary: '0 0 0 2px white, 0 0 0 4px #14B8A6',
    secondary: '0 0 0 2px white, 0 0 0 4px #10B981',
    danger: '0 0 0 2px white, 0 0 0 4px #F43F5E',
    onDark: '0 0 0 2px #1F2937, 0 0 0 4px white',
  };

  return boxShadows[variant];
}

/**
 * Utility function to generate WCAG-compliant focus states for any interactive element
 * Use this for consistent focus styling across the application
 */
export function getInteractiveFocusStyles(variant: 'primary' | 'secondary' | 'danger' | 'onDark' = 'primary') {
  return {
    focus: {
      outline: 'none',
      boxShadow: getFocusStyleCSS(variant),
    },
    focusVisible: {
      outline: 'none',
      boxShadow: getFocusStyleCSS(variant),
    },
  };
}
