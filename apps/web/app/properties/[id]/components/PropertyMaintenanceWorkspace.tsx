'use client';
import { useState } from 'react';
import { Layers, Briefcase, Check } from 'lucide-react';
import { isOpenPropertyJob } from '@mintenance/shared';
import { FeatureGateCard } from '@/components/FeatureGateCard';
import RecurringMaintenance from './RecurringMaintenance';
import { PropertyWorkQueue } from './PropertyWorkQueue';
import { WorkspaceStat } from './PropertyWorkspacePrimitives';
import type { JobItem } from './MintEditorialPropertyCards';
export function PropertyMaintenanceWorkspace({
  propertyId,
  jobs,
}: {
  propertyId: string;
  jobs: JobItem[];
}) {
  const [count, setCount] = useState<number | null>(null);
  return (
    <div className='pw-stack'>
      <div className='pw-stats'>
        <WorkspaceStat
          icon={Layers}
          label='Recurring tasks'
          value={count ?? '—'}
        />
        <WorkspaceStat
          icon={Briefcase}
          label='Open jobs'
          value={jobs.filter((j) => isOpenPropertyJob(j.status)).length}
        />
        <WorkspaceStat
          icon={Check}
          label='Completed jobs'
          value={jobs.filter((j) => j.status === 'completed').length}
        />
      </div>
      <FeatureGateCard featureId='HOMEOWNER_RECURRING_MAINTENANCE'>
        <RecurringMaintenance
          propertyId={propertyId}
          plan
          onCountChange={setCount}
        />
      </FeatureGateCard>
      <PropertyWorkQueue jobs={jobs} />
    </div>
  );
}
