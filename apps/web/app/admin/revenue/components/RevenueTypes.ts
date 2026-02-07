import { RevenueMetrics, MRRMetrics, RevenueTrend } from '@/lib/services/revenue/RevenueAnalytics';

export interface ConversionRateData {
  conversionRate: number;
  totalTrials: number;
  convertedTrials: number;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export type { RevenueMetrics, MRRMetrics, RevenueTrend };
