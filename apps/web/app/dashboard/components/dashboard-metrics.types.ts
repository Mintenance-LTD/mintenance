'use client';

import { ReactNode } from 'react';

export interface DashboardMetricTrend {
  direction: 'up' | 'down' | 'neutral';
  value: string;
  label: string;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: ReactNode;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  gradientVariant?: 'primary' | 'success' | 'warning' | 'error';
  gradient?: boolean;
  trend?: DashboardMetricTrend;
}


