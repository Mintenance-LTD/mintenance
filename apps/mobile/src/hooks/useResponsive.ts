import { useState, useEffect } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import { breakpoints } from '../utils/platformAdapter';

interface ResponsiveValues {
  isWeb: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

export function useResponsive(): ResponsiveValues {
  const dimensions = useWindowDimensions();
  const [values, setValues] = useState<ResponsiveValues>(() => ({
    isWeb: Platform.OS === 'web',
    isMobile: dimensions.width < breakpoints.mobile,
    isTablet:
      dimensions.width >= breakpoints.mobile &&
      dimensions.width < breakpoints.desktop,
    isDesktop: dimensions.width >= breakpoints.desktop,
    width: dimensions.width,
    height: dimensions.height,
    breakpoint:
      dimensions.width >= breakpoints.desktop
        ? 'desktop'
        : dimensions.width >= breakpoints.mobile
          ? 'tablet'
          : 'mobile',
  }));

  useEffect(() => {
    const isMobile = dimensions.width < breakpoints.mobile;
    const isTablet =
      dimensions.width >= breakpoints.mobile &&
      dimensions.width < breakpoints.desktop;
    const isDesktop = dimensions.width >= breakpoints.desktop;

    setValues({
      isWeb: Platform.OS === 'web',
      isMobile,
      isTablet,
      isDesktop,
      width: dimensions.width,
      height: dimensions.height,
      breakpoint: isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile',
    });
  }, [dimensions.width, dimensions.height]);

  return values;
}

function useResponsiveValue<T>(values: {
  mobile: T;
  tablet?: T;
  desktop?: T;
}): T {
  const { breakpoint } = useResponsive();

  switch (breakpoint) {
    case 'desktop':
      return values.desktop ?? values.tablet ?? values.mobile;
    case 'tablet':
      return values.tablet ?? values.mobile;
    case 'mobile':
    default:
      return values.mobile;
  }
}

export function useResponsiveStyle(styles: {
  mobile: unknown;
  tablet?: unknown;
  desktop?: unknown;
}) {
  return useResponsiveValue(styles);
}

// Grid system for responsive layouts
interface GridProps {
  columns: number;
  gap?: number;
  responsive?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export function useResponsiveGrid(props: GridProps) {
  // 2026-05-02 audit follow-up (98% readiness step 7): the previous
  // call site invoked `useResponsiveValue` only when `props.responsive`
  // was truthy, which is a Rules-of-Hooks violation — React requires
  // every hook to fire on every render in a stable order. We always
  // call the hook now and pick between its result and the literal
  // `props.columns` afterwards. The hook tolerates undefined inputs
  // by falling back to the mobile breakpoint, so passing the same
  // structure in both cases is safe.
  useResponsive();
  const responsiveColumns = useResponsiveValue({
    mobile: props.responsive?.mobile ?? props.columns,
    tablet: props.responsive?.tablet,
    desktop: props.responsive?.desktop,
  });
  const columns = props.responsive ? responsiveColumns : props.columns;

  const gap = props.gap ?? 16;

  return {
    columns,
    gap,
    columnWidth: `${100 / columns}%`,
    gridStyle: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      marginHorizontal: -gap / 2,
    },
    itemStyle: {
      width: `${100 / columns}%`,
      paddingHorizontal: gap / 2,
      marginBottom: gap,
    },
  };
}

// Layout detection


// Sidebar layout helper
export function useSidebarLayout() {
  const { isDesktop } = useResponsive();

  return {
    shouldShowSidebar: isDesktop,
    sidebarWidth: 280,
    contentMargin: isDesktop ? 280 : 0,
  };
}

// Multi-column layout helper
