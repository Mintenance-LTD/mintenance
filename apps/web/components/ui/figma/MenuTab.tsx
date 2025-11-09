'use client';

import React from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Calendar, 
  Briefcase, 
  MessageCircle, 
  Home, 
  PoundSterling, 
  Settings, 
  Users, 
  Building, 
  TrendingUp, 
  HelpCircle,
  LogOut,
  LucideIcon
} from 'lucide-react';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import styles from './MenuTab.module.css';

interface MenuTabProps {
  icon: string;
  label: string;
  href: string;
  isActive?: boolean;
  isExpanded?: boolean;
  onClick?: () => void;
}

// Helper function to get Lucide icon component from icon name
function getIconComponent(iconName: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    dashboard: LayoutDashboard,
    calendar: Calendar,
    briefcase: Briefcase,
    messages: MessageCircle,
    home: Home,
    currencyDollar: PoundSterling, // British pound for UK app - ALWAYS use pound, never dollar
    settings: Settings,
    users: Users,
    building: Building,
    trendingUp: TrendingUp,
    helpCircle: HelpCircle,
    logOut: LogOut,
  };
  
  // Ensure currencyDollar always returns PoundSterling, never DollarSign
  if (iconName === 'currencyDollar' || iconName === 'currency' || iconName === 'dollar') {
    return PoundSterling;
  }
  
  return iconMap[iconName] || LayoutDashboard; // Default to LayoutDashboard if not found
}

export function MenuTab({ icon, label, href, isActive = false, isExpanded = true, onClick }: MenuTabProps) {
  // Always render the same structure to prevent hydration mismatches
  // Use CSS classes instead of inline styles to avoid style normalization issues
  const linkClassName = cn(
    styles.menuTab,
    isExpanded ? styles.menuTabExpanded : styles.menuTabCollapsed,
    isActive ? styles.menuTabActive : styles.menuTabInactive,
    isActive && isExpanded && styles.menuTabActiveExpanded
  );

  const labelClassName = cn(
    styles.menuTabLabel,
    isExpanded ? styles.menuTabLabelExpanded : styles.menuTabLabelCollapsed,
    isActive ? styles.menuTabLabelActive : styles.menuTabLabelInactive
  );

  // Use CSS variables for dynamic colors to avoid inline style normalization
  // Only include minimal inline styles for theme colors that need to be dynamic
  const linkStyle = {
    '--menu-tab-active-bg': theme.colors.surface,
    '--menu-tab-active-color': theme.colors.secondary,
    '--menu-tab-inactive-color': theme.colors.textInverse,
    '--menu-tab-indicator-color': theme.colors.secondary,
  } as React.CSSProperties;

  // Standardize icon color - always use theme colors, never hardcoded
  const iconColor = isActive ? theme.colors.secondary : theme.colors.textInverse;
  
  // CRITICAL: Always resolve icon deterministically - ensure currencyDollar ALWAYS maps to PoundSterling
  // This prevents any hydration mismatches or screen-size-dependent rendering
  // Resolve icon synchronously (not in useMemo) to ensure consistent SSR/client rendering
  const normalizedIconName = icon === 'currencyDollar' || icon === 'currency' || icon === 'dollar' 
    ? 'currencyDollar' 
    : icon;
  const IconComponent = getIconComponent(normalizedIconName);

  // Ensure className is always a string to prevent className.split errors
  const classNameString = typeof linkClassName === 'string' ? linkClassName : String(linkClassName || '');
  const labelClassNameString = typeof labelClassName === 'string' ? labelClassName : String(labelClassName || '');

  return (
    <Link
      href={href}
      onClick={onClick}
      className={classNameString}
      style={linkStyle}
      suppressHydrationWarning
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = theme.colors.primaryLight;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <span className={styles.menuTabIcon} suppressHydrationWarning>
        <IconComponent 
          size={22} 
          style={{ color: iconColor }}
          aria-hidden="true"
        />
      </span>
      <span className={labelClassNameString} suppressHydrationWarning>
        {label}
      </span>
      {isActive && <div className={styles.activeIndicator} suppressHydrationWarning />}
    </Link>
  );
}

