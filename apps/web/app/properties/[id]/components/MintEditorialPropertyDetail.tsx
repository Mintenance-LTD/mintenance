'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import {
  PhotoHero,
  PropertyDetailsCard,
  PropertyHeader,
  PropertyHealthCard,
  RecentJobsCard,
  type JobItem,
  type PropertyShape,
  type Stats,
} from './MintEditorialPropertyCards';

interface Props {
  property: PropertyShape;
  jobs: JobItem[];
  stats: Stats;
}

export function MintEditorialPropertyDetail({ property, jobs, stats }: Props) {
  return (
    <HomeownerPageWrapper>
      <Link
        href='/properties'
        className='btn btn-ghost btn-sm'
        style={{ marginBottom: 14 }}
      >
        <ArrowLeft size={14} strokeWidth={1.75} /> Properties
      </Link>

      <PhotoHero property={property} />
      <PropertyHeader property={property} stats={stats} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 18,
        }}
      >
        <div className='col' style={{ gap: 18 }}>
          <PropertyDetailsCard property={property} />
          <RecentJobsCard jobs={jobs} propertyId={property.id} />
        </div>
        <aside
          className='col'
          style={{
            gap: 18,
            position: 'sticky',
            top: 84,
            alignSelf: 'start',
          }}
        >
          <PropertyHealthCard property={property} jobs={jobs} stats={stats} />
        </aside>
      </div>
    </HomeownerPageWrapper>
  );
}
