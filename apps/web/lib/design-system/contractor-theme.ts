/**
 * Unified Design System for Contractor Pages
 * Inspired by Airbnb's clean, professional design aesthetic
 *
 * Key Principles:
 * - Clean, minimal design with ample whitespace
 * - Professional appearance (no emojis, use Lucide icons)
 * - Consistent spacing and typography
 * - Subtle gradients only where appropriate
 * - Mobile-first responsive design
 * - Always use pounds (£) for currency
 */

export const contractorTheme = {
  // Spacing scale (px) - Airbnb uses 8px base unit
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  // Typography - Professional, readable hierarchy
  typography: {
    // Page titles
    h1: {
      fontSize: '32px',
      fontWeight: '700', // font-bold only for main titles
      lineHeight: '40px',
      letterSpacing: '-0.02em',
    },
    // Section titles
    h2: {
      fontSize: '24px',
      fontWeight: '600', // font-semibold for sections
      lineHeight: '32px',
      letterSpacing: '-0.01em',
    },
    // Subsection titles
    h3: {
      fontSize: '18px',
      fontWeight: '600',
      lineHeight: '24px',
    },
    // Card titles
    h4: {
      fontSize: '16px',
      fontWeight: '600',
      lineHeight: '24px',
    },
    // Body text - DEFAULT weight (400)
    body: {
      fontSize: '15px',
      fontWeight: '400', // Normal weight for all body text
      lineHeight: '22px',
    },
    // Small text
    small: {
      fontSize: '13px',
      fontWeight: '400',
      lineHeight: '18px',
    },
    // Tiny text (labels, badges)
    tiny: {
      fontSize: '12px',
      fontWeight: '500', // Slightly heavier for legibility at small size
      lineHeight: '16px',
    },
  },

  // Colors - Clean, professional palette
  colors: {
    // Primary brand color
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6', // Main primary
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    // Neutral grays
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    // Status colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Border radius - Airbnb uses consistent rounded corners
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // Shadows - Subtle, professional elevation
  shadows: {
    // Hover state
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    // Cards
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    // Elevated cards
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    // Modals
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  // Layout constraints
  layout: {
    // Sidebar width
    sidebarWidth: '240px',
    // Main content max width (centered)
    contentMaxWidth: '1280px',
    // Content padding from edges
    contentPadding: '32px',
    // Gap between sidebar and content
    sidebarGap: '0px', // No gap, content starts right after sidebar
    // Card spacing
    cardGap: '24px',
  },

  // Card styles
  card: {
    // Standard white card with subtle shadow
    default: {
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    // Hover state
    hover: {
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      borderColor: '#d1d5db',
    },
  },

  // Gradient usage - MINIMAL, only for CTAs
  gradients: {
    // Primary action buttons ONLY
    primary: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    // NO gradients for cards or backgrounds
  },
} as const;

/**
 * Helper function to format currency in pounds
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Helper function to get consistent transition classes
 */
export function getTransitionClasses(): string {
  return 'transition-all duration-200 ease-in-out';
}
