'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/components/ui/ChartSkeleton';

const AIMonitoringClient = dynamic(
  () =>
    import('./components/AIMonitoringClient').then((mod) => ({
      default: mod.AIMonitoringClient,
    })),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false,
  }
);

export default function AIMonitoringPage() {
  return <AIMonitoringClient />;
}
