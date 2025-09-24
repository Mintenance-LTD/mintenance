import { useState, useEffect } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import { breakpoints } from '../utils/platformAdapter';

export interface ResponsiveValues {
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
    isTablet: dimensions.width >= breakpoints.mobile && dimensions.width < breakpoints.desktop,
    isDesktop: dimensions.width >= breakpoints.desktop,
    width: dimensions.width,
    height: dimensions.height,
    breakpoint: dimensions.width >= breakpoints.desktop ? 'desktop'
                : dimensions.width >= breakpoints.mobile ? 'tablet'
                : 'mobile',
  }));

  useEffect(() => {
    const isMobile = dimensions.width < breakpoints.mobile;
    const isTablet = dimensions.width >= breakpoints.mobile && dimensions.width < breakpoints.desktop;
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

export function useResponsiveValue<T>(values: {
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
  mobile: any;
  tablet?: any;
  desktop?: any;
}) {
  return useResponsiveValue(styles);
}

// Grid system for responsive layouts
export interface GridProps {
  columns: number;
  gap?: number;
  responsive?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export function useResponsiveGrid(props: GridProps) {
  const { breakpoint } = useResponsive();

  const columns = props.responsive
    ? useResponsiveValue({
        mobile: props.responsive.mobile ?? props.columns,
        tablet: props.responsive.tablet,
        desktop: props.responsive.desktop,
      })
    : props.columns;

  const gap = props.gap ?? 16;

  return {
    columns,
    gap,
    columnWidth: `${(100 / columns)}%`,
    gridStyle: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      marginHorizontal: -gap / 2,
    },
    itemStyle: {
      width: `${(100 / columns)}%`,
      paddingHorizontal: gap / 2,
      marginBottom: gap,
    },
  };
}

// Layout detection
export function useLayoutMode(): 'mobile' | 'desktop' {
  const { isWeb, isDesktop } = useResponsive();

  return isWeb && isDesktop ? 'desktop' : 'mobile';
}

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
export function useMultiColumnLayout() {
  const responsive = useResponsive();

  const getColumnCount = () => {
    if (responsive.isDesktop) {
      return responsive.width > 1600 ? 3 : 2;
    }
    return 1;
  };

  const columns = getColumnCount();
  const gap = 24;
  const columnWidth = responsive.isDesktop
    ? `${(100 / columns)}%`
    : '100%';

  return {
    columns,
    columnWidth,
    gap,
    isMultiColumn: columns > 1,
    containerStyle: {
      flexDirection: columns > 1 ? 'row' as const : 'column' as const,
      gap: columns > 1 ? gap : 0,
    },
    columnStyle: {
      flex: columns > 1 ? 1 : undefined,
      width: columns > 1 ? undefined : '100%',
    },
  };
}