// Responsive layout components
export { ResponsiveContainer } from './ResponsiveContainer';
export { ResponsiveGrid, ResponsiveGridItem } from './ResponsiveGrid';
export { ResponsiveNavigation } from './ResponsiveNavigation';

// Re-export responsive hooks for convenience
export {
  useResponsive,
  useResponsiveValue,
  useResponsiveStyle,
  useResponsiveGrid,
  useLayoutMode,
  useSidebarLayout,
  useMultiColumnLayout,
} from '../../hooks/useResponsive';

// Re-export platform utilities
export {
  isWeb,
  isMobile,
  platformCapabilities,
  createPlatformAdapter,
} from '../../utils/platformAdapter';