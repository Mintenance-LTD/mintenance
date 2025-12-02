'use client';

import { Calendar } from '@/components/Calendar/Calendar';
import { SchedulingKpiCards } from './SchedulingKpiCards';

interface PageContentProps {
  events: Array<{
    id: string;
    title: string;
    date: Date | string;
    type: 'job' | 'maintenance' | 'inspection';
    status?: string;
  }>;
}

export function PageContent({ events }: PageContentProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
      gap: '24px',
      alignItems: 'start',
    }}>
      {/* Calendar - Left Side (Larger) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <Calendar events={events} />
      </div>

      {/* Additional KPIs - Right Side (Narrower) */}
      <div>
        <SchedulingKpiCards />
      </div>
    </div>
  );
}

