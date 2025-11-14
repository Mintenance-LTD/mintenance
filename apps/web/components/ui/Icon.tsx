'use client';

import React, { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icon Component
 * Migrated to Lucide React for professional, consistent iconography
 * Maintains backward compatibility with existing icon names
 */

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

/**
 * Mapping from existing icon names to Lucide icon component names
 * This ensures backward compatibility with existing code
 */
const ICON_NAME_MAP: Readonly<Record<string, keyof typeof LucideIcons>> = {
  // Navigation
  home: 'Home',
  dashboard: 'LayoutDashboard',
  jobs: 'Briefcase',
  discover: 'Compass',
  search: 'Search',
  messages: 'MessageCircle',
  profile: 'User',
  settings: 'Settings',
  users: 'Users',

  // Status & Actions
  star: 'Star',
  starFilled: 'Star',
  check: 'Check',
  checkCircle: 'CheckCircle',
  userCheck: 'UserCheck',
  xCircle: 'XCircle',
  alert: 'AlertTriangle',
  info: 'Info',
  help: 'HelpCircle',
  helpCircle: 'HelpCircle',
  warning: 'AlertTriangle',
  dot: 'Circle',

  // Location & Map
  mapPin: 'MapPin',
  map: 'Map',
  navigation: 'MapPin',

  // Business Icons
  briefcase: 'Briefcase',
  document: 'FileText',
  clipboard: 'Clipboard',
  currencyDollar: 'DollarSign',
  dollarSign: 'DollarSign',
  currencyPound: 'PoundSterling',
  creditCard: 'CreditCard',
  chart: 'BarChart3',
  pieChart: 'PieChart',
  target: 'Target',
  radar: 'Radar',
  calendar: 'Calendar',
  camera: 'Camera',
  image: 'Image',
  fileText: 'FileText',
  fileCheck: 'FileCheck',
  collection: 'Grid3x3',
  idCard: 'IdCard',
  video: 'Video',
  megaphone: 'Megaphone',
  activity: 'Activity',
  notebook: 'Notebook',
  progress: 'TrendingUp',
  lightBulb: 'Lightbulb',

  // UI Actions
  x: 'X',
  menu: 'Menu',
  clock: 'Clock',
  plus: 'Plus',
  minus: 'Minus',
  edit: 'Pencil',
  refresh: 'RefreshCw',
  loader: 'Loader2',
  trash: 'Trash2',
  eye: 'Eye',
  download: 'Download',
  upload: 'Upload',
  printer: 'Printer',
  filter: 'Filter',
  bell: 'Bell',
  phone: 'Phone',

  // Arrows & Navigation
  arrowRight: 'ArrowRight',
  arrowLeft: 'ArrowLeft',
  arrowUp: 'ArrowUp',
  arrowDown: 'ArrowDown',
  chevronRight: 'ChevronRight',
  chevronLeft: 'ChevronLeft',
  chevronDown: 'ChevronDown',
  chevronUp: 'ChevronUp',
  sparkles: 'Sparkles',

  // Social
  share: 'Share2',
  heart: 'Heart',
  bookmark: 'Bookmark',
  bookmarkOutline: 'Bookmark',
  userPlus: 'UserPlus',
  copy: 'Copy',

  // Verification
  badge: 'BadgeCheck',

  // Additional Icons
  logOut: 'LogOut',
  building: 'Building',
  trendingUp: 'TrendingUp',
  shield: 'Shield',
  lock: 'Lock',
  user: 'User',
  leaf: 'Leaf',
} as const;

/**
 * Custom icons that don't exist in Lucide
 * These will be rendered as SVG paths
 */
const CUSTOM_ICONS: Readonly<Record<string, JSX.Element>> = {
  mintLeaf: (
    <g strokeLinecap="round" strokeLinejoin="round" fill="currentColor">
      <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5c0-2.5-2-4.5-4.5-4.5z" />
      <path stroke="currentColor" strokeWidth="1.5" d="M12 2v10M9 6.5h6M10 4.5c1 1 3 3 3 3M14 4.5c-1 1-3 3-3 3" />
      <path stroke="currentColor" strokeWidth="1" d="M7.5 6.5l0.5-0.3M8 7.5l0.5-0.3M8.5 8.5l0.5-0.3M16.5 6.5l-0.5-0.3M16 7.5l-0.5-0.3M15.5 8.5l-0.5-0.3" />
      <path d="M12 12.5l0 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
} as const;

/**
 * Get the Lucide icon component for a given icon name
 * Handles both camelCase and lowercase variants
 */
function getLucideIcon(iconName: string): LucideIcon | null {
  // Try exact match first (for camelCase like "starFilled")
  let mappedName = ICON_NAME_MAP[iconName];
  
  // If not found, try lowercase variant
  if (!mappedName) {
    mappedName = ICON_NAME_MAP[iconName.toLowerCase()];
  }
  
  if (!mappedName) {
    // Log missing icon in development to help debug
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn(`Icon "${iconName}" not found in ICON_NAME_MAP`);
    }
    return null;
  }

  const IconComponent = LucideIcons[mappedName];
  if (!IconComponent) {
    // Log missing Lucide icon in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn(`Lucide icon "${mappedName}" not found in lucide-react`);
    }
    return null;
  }
  
  return typeof IconComponent === 'function' ? (IconComponent as LucideIcon) : null;
}

/**
 * Icon Component - Migrated to Lucide React
 * 
 * Usage:
 * <Icon name="home" size={20} color="currentColor" />
 * <Icon name="starFilled" size={24} className="text-yellow-500" />
 */
export function Icon({
  name,
  size = 20,
  color = 'currentColor',
  className = '',
  style = {},
  title,
}: IconProps): JSX.Element | null {
  // Ensure name is always a string and trim whitespace
  const trimmedName = String(name || '').trim();

  if (!trimmedName) {
    return null;
  }

  const normalizedName = trimmedName.toLowerCase();

  // Memoize icon resolution to ensure consistent rendering
  // Use deterministic resolution order to prevent server/client mismatches
  const iconData = useMemo(() => {
    // Check for custom icons first (e.g., mintLeaf) - exact match then lowercase
    const customIcon = CUSTOM_ICONS[trimmedName] || CUSTOM_ICONS[normalizedName];
    if (customIcon) {
      return { type: 'custom' as const, icon: customIcon, key: `custom-${trimmedName}` };
    }

    // Try to get Lucide icon - exact match then lowercase
    const IconComponent = getLucideIcon(trimmedName);
    if (!IconComponent) {
      return { type: 'fallback' as const, icon: LucideIcons.Info as LucideIcon, key: `fallback-${trimmedName}` };
    }

    return { type: 'lucide' as const, icon: IconComponent, key: `lucide-${trimmedName}` };
  }, [trimmedName, normalizedName]);

  // Handle custom icons
  if (iconData.type === 'custom') {
    return (
      <span 
        key={iconData.key}
        suppressHydrationWarning 
        style={{ display: 'contents' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          style={style}
          aria-hidden={title ? undefined : 'true'}
          role={title ? 'img' : undefined}
          aria-label={title}
        >
          {title && <title>{title}</title>}
          {iconData.icon}
        </svg>
      </span>
    );
  }

  // Handle Lucide icons (including fallback)
  const IconComponent = iconData.icon as LucideIcon;
  const isFilled = 
    normalizedName === 'starfilled' || 
    normalizedName === 'star-filled' ||
    trimmedName === 'starFilled';
  const isBookmarkOutline = 
    normalizedName === 'bookmarkoutline' || 
    normalizedName === 'bookmark-outline' ||
    trimmedName === 'bookmarkOutline';

  // Always wrap Lucide icons in a span with suppressHydrationWarning for consistent rendering
  return (
    <span 
      key={iconData.key}
      suppressHydrationWarning 
      style={{ display: 'contents' }}
    >
      <IconComponent
        size={size}
        color={color}
        className={className}
        style={style}
        fill={isBookmarkOutline ? 'none' : (isFilled ? color : 'none')}
        aria-label={title}
        aria-hidden={title ? undefined : 'true'}
        role={title ? 'img' : undefined}
      />
    </span>
  );
}

/**
 * Convenience export for filled icons
 * Note: Most Lucide icons are outline by default. Use fill prop for filled variants.
 */
export function IconFilled({
  name,
  size = 20,
  color = 'currentColor',
  className = '',
  style = {},
}: IconProps): JSX.Element | null {
  return (
    <Icon
      name={name === 'star' ? 'starFilled' : name}
      size={size}
      color={color}
      className={className}
      style={{ ...style, fill: color }}
    />
  );
}
