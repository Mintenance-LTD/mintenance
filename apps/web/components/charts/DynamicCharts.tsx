/**
 * Dynamic Chart Components
 *
 * Code-split recharts library to reduce initial bundle size.
 * Recharts is ~100KB gzipped, so this provides significant savings.
 *
 * Usage:
 *   import { DynamicAreaChart, DynamicBarChart } from '@/components/charts/DynamicCharts';
 *
 * Benefits:
 * - Reduces initial bundle by ~100KB (recharts library)
 * - Lazy loads only when charts are needed
 * - Shows skeleton during load
 */

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/skeletons';

// Area Chart (used in dashboards)
export const DynamicAreaChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.AreaChart })),
  {
    loading: () => <ChartSkeleton height={300} />,
    ssr: false,
  }
);

// Bar Chart (used in analytics)
export const DynamicBarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  {
    loading: () => <ChartSkeleton height={300} />,
    ssr: false,
  }
);

// Line Chart (used in reporting)
export const DynamicLineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  {
    loading: () => <ChartSkeleton height={300} />,
    ssr: false,
  }
);

// Pie Chart (used in analytics)
export const DynamicPieChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart })),
  {
    loading: () => <ChartSkeleton height={300} />,
    ssr: false,
  }
);

// Export other recharts components for convenience
// These will be in the same chunk as the chart types above
export { Area, Bar, Line, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
